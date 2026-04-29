const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────
//  MODELO DE PAGOS
//  Contiene todas las consultas SQL relacionadas con la tabla
//  `pagos`. Cada función recibe parámetros ya validados y
//  devuelve los datos directamente desde la base de datos.
// ─────────────────────────────────────────────────────────────


/**
 * Genera una referencia numérica de 7 dígitos única para transferencias.
 * Reintenta hasta 5 veces en caso de colisión (probabilidad muy baja).
 *
 * @param {object} client - Conexión de transacción activa (pool.connect)
 * @returns {string} Referencia de 7 dígitos
 */
const generarReferenciaUnica = async (client) => {
    for (let i = 0; i < 5; i++) {
        const ref = String(Math.floor(1000000 + Math.random() * 9000000));
        const { rowCount } = await client.query(
            'SELECT 1 FROM pagos WHERE referencia = $1',
            [ref]
        );
        if (rowCount === 0) return ref;
    }
    throw new Error('No se pudo generar una referencia única. Inténtalo de nuevo.');
};


/**
 * Crea un registro en pagos y actualiza el pedido a 'esperando_pago'
 * en una sola transacción (UC-07 pasos 9–13).
 *
 * Comportamiento por método:
 *   - efectivo:      sin referencia, sin url.
 *   - transferencia: genera referencia de 7 dígitos.
 *   - link_pago:     usa extras.referencia (payment_request_id) y extras.urlPago
 *                    generados previamente por clipService.
 *
 * El monto se toma directamente del total del pedido en la BD
 * para evitar manipulación desde el cliente.
 *
 * @param {number} idPedido     - ID del pedido (debe pertenecer al idUsuario y estar en 'pendiente')
 * @param {number} idUsuario    - ID del cliente (verificación de pertenencia)
 * @param {number} idMetodoPago - ID del método de pago
 * @param {Object} extras       - Datos adicionales para link_pago: { urlPago, referencia }
 * @returns {Object} El pago creado con todos sus campos y metodo_pago incluido
 */
const createPago = async (idPedido, idUsuario, idMetodoPago, extras = {}) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 0. Obtener y validar el método de pago
        const { rows: metodoRows } = await client.query(
            'SELECT nombre FROM metodos_pago WHERE id_metodo_pago = $1',
            [idMetodoPago]
        );
        if (metodoRows.length === 0) throw new Error('METODO_NO_VALIDO');
        const nombreMetodo = metodoRows[0].nombre;

        // 1. Verificar que el pedido pertenece al usuario y está en 'pendiente'
        const { rows: pedidoRows } = await client.query(
            `SELECT total FROM pedidos
             WHERE id_pedido = $1 AND id_usuario = $2 AND estado = 'pendiente'`,
            [idPedido, idUsuario]
        );
        if (pedidoRows.length === 0) throw new Error('PEDIDO_NO_VALIDO');
        const monto = pedidoRows[0].total;

        // 2. Verificar que no exista ya un pago para este pedido
        const { rowCount } = await client.query(
            'SELECT 1 FROM pagos WHERE id_pedido = $1',
            [idPedido]
        );
        if (rowCount > 0) throw new Error('PAGO_DUPLICADO');

        // 3. Determinar referencia y url_pago según el método
        let referencia = null;
        let urlPago    = null;

        if (nombreMetodo === 'transferencia') {
            referencia = await generarReferenciaUnica(client);
        } else if (nombreMetodo === 'link_pago') {
            referencia = extras.referencia || null;
            urlPago    = extras.urlPago    || null;
        }

        // 4. Insertar el registro de pago
        const { rows: pagoRows } = await client.query(
            `INSERT INTO pagos
               (id_pedido, id_metodo_pago, estado_pago, fecha_registro, referencia, monto, url_pago)
             VALUES ($1, $2, 'pendiente', NOW(), $3, $4, $5)
             RETURNING id_pago, id_pedido, id_metodo_pago, estado_pago,
                       fecha_registro, fecha_confirmacion, referencia,
                       comprobante_pago, url_pago, monto`,
            [idPedido, idMetodoPago, referencia, monto, urlPago]
        );

        // 5. Avanzar el pedido a 'esperando_pago'
        await client.query(
            `UPDATE pedidos SET estado = 'esperando_pago' WHERE id_pedido = $1`,
            [idPedido]
        );

        await client.query('COMMIT');
        return { ...pagoRows[0], metodo_pago: nombreMetodo };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};


/**
 * Obtiene el pago asociado a un pedido, incluyendo el nombre del método.
 * Si se proporciona idUsuario, verifica que el pedido pertenezca al cliente
 * antes de devolver el pago (uso desde rol CLIENTE).
 *
 * @param {number}      idPedido  - ID del pedido
 * @param {number|null} idUsuario - ID del cliente para verificar pertenencia (null = sin restricción)
 * @returns {Object|null} El pago con datos del método, o null si no existe / no pertenece
 */
const findPagoByPedido = async (idPedido, idUsuario = null) => {
    let query, params;

    if (idUsuario !== null) {
        query = `
            SELECT pg.id_pago, pg.id_pedido, pg.id_metodo_pago,
                   mp.nombre AS metodo_pago, pg.estado_pago,
                   pg.fecha_registro, pg.fecha_confirmacion,
                   pg.referencia, pg.comprobante_pago, pg.url_pago, pg.monto
            FROM pagos pg
            JOIN metodos_pago mp ON mp.id_metodo_pago = pg.id_metodo_pago
            JOIN pedidos      pe ON pe.id_pedido       = pg.id_pedido
            WHERE pg.id_pedido = $1 AND pe.id_usuario = $2`;
        params = [idPedido, idUsuario];
    } else {
        query = `
            SELECT pg.id_pago, pg.id_pedido, pg.id_metodo_pago,
                   mp.nombre AS metodo_pago, pg.estado_pago,
                   pg.fecha_registro, pg.fecha_confirmacion,
                   pg.referencia, pg.comprobante_pago, pg.url_pago, pg.monto
            FROM pagos pg
            JOIN metodos_pago mp ON mp.id_metodo_pago = pg.id_metodo_pago
            WHERE pg.id_pedido = $1`;
        params = [idPedido];
    }

    const { rows } = await pool.query(query, params);
    return rows[0] || null;
};


/**
 * Lista todos los pagos con estado 'pendiente' para revisión del vendedor.
 * Incluye nombre del cliente y nombre del método de pago (UC-10 pasos 1–2).
 *
 * @returns {Array} Pagos pendientes ordenados del más antiguo al más reciente
 */
const findPagosPendientes = async () => {
    const { rows } = await pool.query(
        `SELECT
           pg.id_pago, pg.id_pedido, pg.monto, pg.referencia,
           pg.comprobante_pago, pg.fecha_registro, pg.estado_pago,
           mp.nombre AS metodo_pago,
           u.nombre  AS nombre_cliente,
           u.email   AS email_cliente
         FROM pagos pg
         JOIN pedidos      pe ON pe.id_pedido        = pg.id_pedido
         JOIN usuarios     u  ON u.id_usuario         = pe.id_usuario
         JOIN metodos_pago mp ON mp.id_metodo_pago    = pg.id_metodo_pago
         WHERE pg.estado_pago = 'pendiente'
         ORDER BY pg.fecha_registro ASC`
    );
    return rows;
};


/**
 * Confirma un pago: actualiza estado_pago a 'confirmado', registra
 * fecha_confirmacion y avanza el pedido a 'pagado'. Todo en una transacción.
 * Solo aplica si el pago está actualmente en 'pendiente' (UC-10 pasos 6–9).
 *
 * @param {number} idPago - ID del pago a confirmar
 * @returns {Object|null} El pago actualizado, o null si no estaba pendiente
 */
const confirmarPago = async (idPago) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `UPDATE pagos
             SET estado_pago = 'confirmado', fecha_confirmacion = NOW()
             WHERE id_pago = $1 AND estado_pago = 'pendiente'
             RETURNING id_pago, id_pedido, id_metodo_pago, estado_pago,
                       fecha_registro, fecha_confirmacion, referencia,
                       comprobante_pago, url_pago, monto`,
            [idPago]
        );
        const pago = rows[0];

        if (!pago) {
            await client.query('ROLLBACK');
            return null;
        }

        await client.query(
            `UPDATE pedidos SET estado = 'pagado' WHERE id_pedido = $1`,
            [pago.id_pedido]
        );

        await client.query('COMMIT');
        return pago;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};


/**
 * Rechaza un pago: actualiza estado_pago a 'rechazado'.
 * El pedido permanece en 'esperando_pago' para que el cliente
 * pueda adjuntar un nuevo comprobante (UC-10 paso 6b).
 * Solo aplica si el pago está actualmente en 'pendiente'.
 *
 * @param {number} idPago - ID del pago a rechazar
 * @returns {Object|null} El pago actualizado, o null si no estaba pendiente
 */
const rechazarPago = async (idPago) => {
    const { rows } = await pool.query(
        `UPDATE pagos
         SET estado_pago = 'rechazado'
         WHERE id_pago = $1 AND estado_pago = 'pendiente'
         RETURNING id_pago, id_pedido, id_metodo_pago, estado_pago,
                   fecha_registro, fecha_confirmacion, referencia,
                   comprobante_pago, url_pago, monto`,
        [idPago]
    );
    return rows[0] || null;
};


/**
 * Guarda la ruta del comprobante en la tabla pagos (UC-08 pasos 6–7).
 * Verifica ownership a través del pedido. Permite reemplazar comprobante existente.
 * Si el pago estaba 'rechazado', lo regresa a 'pendiente' para que el
 * vendedor pueda revisarlo nuevamente.
 *
 * Condiciones para que aplique:
 *   - El pago pertenece al pedido del usuario autenticado.
 *   - El pago está en estado 'pendiente' o 'rechazado'.
 *   - El pedido está en estado 'esperando_pago'.
 *
 * @param {number} idPago      - ID del pago a actualizar
 * @param {number} idUsuario   - ID del cliente (verificación de pertenencia)
 * @param {string} rutaArchivo - Ruta relativa del archivo subido
 * @returns {Object|null} El pago actualizado, o null si las condiciones no se cumplen
 */
const adjuntarComprobante = async (idPago, idUsuario, rutaArchivo) => {
    const { rows } = await pool.query(
        `UPDATE pagos
         SET comprobante_pago = $1,
             estado_pago      = 'pendiente'
         FROM pedidos
         WHERE pagos.id_pago       = $2
           AND pedidos.id_pedido   = pagos.id_pedido
           AND pedidos.id_usuario  = $3
           AND pagos.estado_pago  IN ('pendiente', 'rechazado')
           AND pedidos.estado      = 'esperando_pago'
         RETURNING pagos.id_pago, pagos.id_pedido, pagos.id_metodo_pago,
                   pagos.estado_pago, pagos.fecha_registro, pagos.fecha_confirmacion,
                   pagos.referencia, pagos.comprobante_pago, pagos.url_pago, pagos.monto`,
        [rutaArchivo, idPago, idUsuario]
    );
    return rows[0] || null;
};


/**
 * Obtiene todos los métodos de pago disponibles en la tabla metodos_pago.
 *
 * @returns {Array} Lista de métodos con id_metodo_pago y nombre
 */
const findMetodosPago = async () => {
    const { rows } = await pool.query(
        'SELECT id_metodo_pago, nombre FROM metodos_pago ORDER BY id_metodo_pago'
    );
    return rows;
};


/**
 * Obtiene el nombre de un método de pago por su ID.
 * Usado por el controller para detectar link_pago antes de llamar a Clip.
 *
 * @param {number} idMetodoPago
 * @returns {{ nombre: string }|null}
 */
const findMetodoPagoById = async (idMetodoPago) => {
    const { rows } = await pool.query(
        'SELECT nombre FROM metodos_pago WHERE id_metodo_pago = $1',
        [idMetodoPago]
    );
    return rows[0] || null;
};


/**
 * Devuelve el total de un pedido en estado 'pendiente' que pertenezca al usuario.
 * Usado antes de llamar a Clip para obtener el monto a cobrar.
 *
 * @param {number} idPedido
 * @param {number} idUsuario
 * @returns {string|null} Total numérico como string (PostgreSQL NUMERIC), o null si no aplica
 */
const findPedidoTotal = async (idPedido, idUsuario) => {
    const { rows } = await pool.query(
        `SELECT total FROM pedidos
         WHERE id_pedido = $1 AND id_usuario = $2 AND estado = 'pendiente'`,
        [idPedido, idUsuario]
    );
    return rows[0] ? rows[0].total : null;
};


/**
 * Confirma un pago de Clip buscándolo por su payment_request_id (campo referencia).
 * Actualiza estado_pago a 'confirmado' y avanza el pedido a 'pagado'.
 * Llamado desde el webhook de Clip cuando status = CHECKOUT_COMPLETED.
 *
 * @param {string} referencia - payment_request_id enviado por Clip en el webhook
 * @returns {Object|null} El pago actualizado, o null si no estaba pendiente / no existe
 */
const confirmarPagoPorReferencia = async (referencia) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `UPDATE pagos
             SET estado_pago = 'confirmado', fecha_confirmacion = NOW()
             WHERE referencia = $1 AND estado_pago = 'pendiente'
             RETURNING id_pago, id_pedido, id_metodo_pago, estado_pago,
                       fecha_registro, fecha_confirmacion, referencia,
                       comprobante_pago, url_pago, monto`,
            [referencia]
        );
        const pago = rows[0];

        if (!pago) {
            await client.query('ROLLBACK');
            return null;
        }

        await client.query(
            `UPDATE pedidos SET estado = 'pagado' WHERE id_pedido = $1`,
            [pago.id_pedido]
        );

        await client.query('COMMIT');
        return pago;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};


module.exports = {
    createPago,
    findPagoByPedido,
    findPagosPendientes,
    confirmarPago,
    rechazarPago,
    adjuntarComprobante,
    findMetodosPago,
    findMetodoPagoById,
    findPedidoTotal,
    confirmarPagoPorReferencia,
};
