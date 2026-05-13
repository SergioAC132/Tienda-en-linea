const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────
//  MODELO DE PEDIDOS
//  Contiene todas las consultas SQL relacionadas con la tabla
//  `pedidos`. Cada función recibe parámetros ya validados y
//  devuelve los datos directamente desde la base de datos.
// ─────────────────────────────────────────────────────────────


/**
 * Crea un nuevo pedido para el usuario autenticado y registra el detalle
 * de productos tomando los items actuales del carrito del usuario.
 * Toda la operación se ejecuta en una única transacción: si falla algún
 * INSERT en detalle_pedidos el pedido completo se revierte.
 *
 * @param {number} idUsuario        - ID del cliente (viene del token JWT)
 * @param {number} total            - Total calculado en el frontend desde el carrito
 * @param {number} idDireccion      - ID de la dirección de entrega seleccionada
 * @param {string|null} comentarios - Comentarios opcionales del cliente
 * @returns {Object} El pedido recién creado con todos sus campos
 */
const createPedido = async (idUsuario, total, idDireccion, comentarios, tipoEntrega = 'envio', idPuntoEntrega = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insertar el pedido principal
        const { rows: pedidoRows } = await client.query(
            `INSERT INTO pedidos (id_usuario, fecha_pedido, estado, total, id_direccion, comentarios_cliente, tipo_entrega, id_punto_entrega)
             VALUES ($1, NOW(), 'pendiente', $2, $3, $4, $5, $6)
             RETURNING id_pedido, id_usuario, fecha_pedido, estado, total,
                       id_direccion, comentarios_cliente, comentarios_vendedor,
                       tipo_entrega, id_punto_entrega`,
            [idUsuario, total, idDireccion, comentarios || null, tipoEntrega, idPuntoEntrega]
        );
        const pedido = pedidoRows[0];

        // 2. Obtener los items del carrito activo del usuario
        const { rows: carritoItems } = await client.query(
            `SELECT ci.id_producto, ci.id_talla, ci.cantidad, p.precio_base
             FROM carrito_items ci
             JOIN carritos  c ON c.id_carrito  = ci.id_carrito
             JOIN productos p ON p.id_producto = ci.id_producto
             WHERE c.id_usuario = $1`,
            [idUsuario]
        );

        // 3. Insertar un registro en detalle_pedidos por cada item del carrito
        //    y reducir el stock de productos_tallas en la misma transacción.
        //    El total del ítem es precio_base × cantidad (precio al momento de compra).
        for (const item of carritoItems) {
            const totalItem = Number(item.precio_base) * item.cantidad;
            await client.query(
                `INSERT INTO detalle_pedidos (id_pedido, id_producto, id_talla, cantidad, total)
                 VALUES ($1, $2, $3, $4, $5)`,
                [pedido.id_pedido, item.id_producto, item.id_talla, item.cantidad, totalItem]
            );

            const { rowCount } = await client.query(
                `UPDATE productos_tallas
                 SET stock = stock - $1
                 WHERE id_producto = $2 AND id_talla = $3 AND stock >= $1`,
                [item.cantidad, item.id_producto, item.id_talla]
            );

            if (rowCount === 0) {
                throw new Error(
                    `Stock insuficiente para el producto ${item.id_producto} en talla ${item.id_talla}.`
                );
            }
        }

        await client.query('COMMIT');
        return pedido;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};


/**
 * Obtiene todos los pedidos que pertenecen a un cliente específico.
 * Se usa en la vista "Mis Pedidos" del cliente.
 * Los pedidos se devuelven ordenados del más reciente al más antiguo.
 *
 * @param {number} idUsuario - ID del cliente autenticado (viene del token JWT)
 * @returns {Array} Lista de pedidos del cliente
 */
const findPedidosByUsuario = async (idUsuario) => {
    const { rows } = await pool.query(
        `SELECT id_pedido, id_usuario, fecha_pedido, estado, total,
                comentarios_cliente, comentarios_vendedor
         FROM pedidos
         WHERE id_usuario = $1
         ORDER BY fecha_pedido DESC`,
        [idUsuario]
    );
    return rows;
};


/**
 * Obtiene un pedido específico por su ID verificando que pertenezca
 * al cliente autenticado. Incluye el detalle de productos (detalle_pedidos)
 * para que el cliente pueda ver qué artículos conforman su pedido.
 *
 * @param {number} idPedido  - ID del pedido a buscar
 * @param {number} idUsuario - ID del cliente autenticado (verificación de pertenencia)
 * @returns {Object|null} El pedido con su detalle, o null si no existe / no pertenece
 */
const findPedidoByIdAndUsuario = async (idPedido, idUsuario) => {
    const { rows } = await pool.query(
        `SELECT
           p.id_pedido, p.id_usuario, p.fecha_pedido, p.estado, p.total,
           p.tipo_entrega, p.id_punto_entrega, p.fecha_hora_entrega,
           p.comentarios_cliente, p.comentarios_vendedor,
           json_build_object(
             'id_direccion',    d.id_direccion,
             'calle',           d.calle,
             'numero_exterior', d.numero_exterior,
             'numero_interior', d.numero_interior,
             'colonia',         d.colonia,
             'ciudad',          d.ciudad,
             'estado',          d.estado,
             'codigo_postal',   d.codigo_postal,
             'pais',            d.pais,
             'referencias',     d.referencias
           ) AS direccion,
           (SELECT json_build_object(
             'id_punto_entrega', pe.id_punto_entrega,
             'nombre',           pe.nombre,
             'descripcion',      pe.descripcion
           ) FROM puntos_entrega pe WHERE pe.id_punto_entrega = p.id_punto_entrega) AS punto_entrega,
           COALESCE(
             json_agg(
               json_build_object(
                 'id_producto',    dp.id_producto,
                 'nombre_producto', pr.nombre,
                 'id_talla',       dp.id_talla,
                 'nombre_talla',   t.nombre,
                 'cantidad',       dp.cantidad,
                 'total',          dp.total,
                 'imagen_url',     img.url_imagen
               ) ORDER BY dp.id_producto
             ) FILTER (WHERE dp.id_pedido IS NOT NULL),
             '[]'
           ) AS detalle_pedidos
         FROM pedidos p
         LEFT JOIN direcciones     d  ON d.id_direccion = p.id_direccion
         LEFT JOIN detalle_pedidos dp ON dp.id_pedido   = p.id_pedido
         LEFT JOIN productos       pr ON pr.id_producto = dp.id_producto
         LEFT JOIN tallas          t  ON t.id_talla     = dp.id_talla
         LEFT JOIN imagen_producto img ON img.id_producto = dp.id_producto
                                     AND img.orden = 1
         WHERE p.id_pedido = $1 AND p.id_usuario = $2
         GROUP BY p.id_pedido, d.id_direccion`,
        [idPedido, idUsuario]
    );
    return rows[0] || null;
};


/**
 * Obtiene un pedido específico por su ID sin restricción de usuario.
 * Usado por Vendedor y Admin para consultar el detalle de cualquier pedido.
 * Incluye el nombre y email del cliente, y el detalle de productos.
 *
 * @param {number} idPedido - ID del pedido a buscar
 * @returns {Object|null} El pedido con su detalle, o null si no existe
 */
const findPedidoById = async (idPedido) => {
    const { rows } = await pool.query(
        `SELECT
           p.id_pedido, p.id_usuario, p.fecha_pedido, p.estado, p.total,
           p.tipo_entrega, p.id_punto_entrega,
           p.comentarios_cliente, p.comentarios_vendedor,
           u.nombre AS nombre_cliente, u.email AS email_cliente, u.telefono AS telefono_cliente,
           p.fecha_hora_entrega,
           json_build_object(
             'id_direccion',    d.id_direccion,
             'calle',           d.calle,
             'numero_exterior', d.numero_exterior,
             'numero_interior', d.numero_interior,
             'colonia',         d.colonia,
             'ciudad',          d.ciudad,
             'estado',          d.estado,
             'codigo_postal',   d.codigo_postal,
             'pais',            d.pais,
             'referencias',     d.referencias
           ) AS direccion,
           (SELECT json_build_object(
             'id_punto_entrega', pe.id_punto_entrega,
             'nombre',           pe.nombre,
             'descripcion',      pe.descripcion
           ) FROM puntos_entrega pe WHERE pe.id_punto_entrega = p.id_punto_entrega) AS punto_entrega,
           COALESCE(
             json_agg(
               json_build_object(
                 'id_producto',    dp.id_producto,
                 'nombre_producto', pr.nombre,
                 'id_talla',       dp.id_talla,
                 'nombre_talla',   t.nombre,
                 'cantidad',       dp.cantidad,
                 'total',          dp.total,
                 'imagen_url',     img.url_imagen
               ) ORDER BY dp.id_producto
             ) FILTER (WHERE dp.id_pedido IS NOT NULL),
             '[]'
           ) AS detalle_pedidos
         FROM pedidos p
         JOIN usuarios u ON u.id_usuario = p.id_usuario
         LEFT JOIN direcciones     d  ON d.id_direccion = p.id_direccion
         LEFT JOIN detalle_pedidos dp ON dp.id_pedido   = p.id_pedido
         LEFT JOIN productos       pr ON pr.id_producto = dp.id_producto
         LEFT JOIN tallas          t  ON t.id_talla     = dp.id_talla
         LEFT JOIN imagen_producto img ON img.id_producto = dp.id_producto
                                     AND img.orden = 1
         WHERE p.id_pedido = $1
         GROUP BY p.id_pedido, u.nombre, u.email, u.telefono, d.id_direccion`,
        [idPedido]
    );
    return rows[0] || null;
};


/**
 * Obtiene todos los pedidos del sistema para la vista del Vendedor y Admin.
 * Incluye el nombre y email del cliente para que el vendedor sepa
 * quién realizó cada pedido sin necesidad de una consulta extra.
 * Los pedidos se ordenan del más reciente al más antiguo.
 *
 * @returns {Array} Lista de todos los pedidos con datos básicos del cliente
 */
const findAllPedidos = async () => {
    const { rows } = await pool.query(
        `SELECT p.id_pedido, p.id_usuario, p.fecha_pedido, p.estado, p.total,
                p.comentarios_cliente, p.comentarios_vendedor,
                u.nombre AS nombre_cliente, u.email AS email_cliente
         FROM pedidos p
         JOIN usuarios u ON p.id_usuario = u.id_usuario
         ORDER BY p.fecha_pedido DESC`
    );
    return rows;
};


/**
 * Actualiza el estado de un pedido.
 * Solo el Vendedor y Admin pueden llamar a esta función.
 * Opcionalmente puede guardar un comentario del vendedor al cambiar el estado.
 *
 * Estados válidos del ENUM en la BD:
 *   pendiente → esperando_pago → pagado → entregado
 *   (cualquier estado) → cancelado
 *
 * @param {number} idPedido             - ID del pedido a actualizar
 * @param {string} nuevoEstado          - Nuevo estado a asignar
 * @param {string|null} comentarios     - Comentario opcional del vendedor
 * @returns {Object|null} El pedido actualizado, o null si no se encontró
 */
const updateEstadoPedido = async (idPedido, nuevoEstado, comentarios) => {
    const { rows } = await pool.query(
        `UPDATE pedidos
         SET estado = $1,
             comentarios_vendedor = COALESCE($2, comentarios_vendedor)
         WHERE id_pedido = $3
         RETURNING id_pedido, id_usuario, fecha_pedido, estado, total,
                   comentarios_cliente, comentarios_vendedor`,
        [nuevoEstado, comentarios || null, idPedido]
    );
    return rows[0] || null;
};


/**
 * Cancela un pedido propio del cliente.
 * Solo se permite cancelar si el pedido está en estado 'pendiente',
 * ya que una vez que entra al flujo de pago no se puede cancelar
 * directamente desde el cliente.
 *
 * Al cancelar, se devuelve el stock de cada ítem del detalle_pedidos
 * a productos_tallas dentro de la misma transacción.
 *
 * @param {number} idPedido  - ID del pedido a cancelar
 * @param {number} idUsuario - ID del cliente (verifica que sea su propio pedido)
 * @returns {Object|null} El pedido cancelado, o null si no se encontró o no era cancelable
 */
const cancelarPedido = async (idPedido, idUsuario) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Cancelar el pedido (solo si pertenece al usuario y está en 'pendiente')
        const { rows } = await client.query(
            `UPDATE pedidos
             SET estado = 'cancelado'
             WHERE id_pedido = $1
               AND id_usuario = $2
               AND estado IN ('pendiente', 'pendiente_programacion')
             RETURNING id_pedido, id_usuario, fecha_pedido, estado, total,
                       comentarios_cliente, comentarios_vendedor`,
            [idPedido, idUsuario]
        );
        const pedido = rows[0] || null;

        // 2. Si se canceló, restaurar el stock de cada ítem
        if (pedido) {
            const { rows: detalle } = await client.query(
                `SELECT id_producto, id_talla, cantidad
                 FROM detalle_pedidos
                 WHERE id_pedido = $1`,
                [idPedido]
            );

            for (const item of detalle) {
                await client.query(
                    `UPDATE productos_tallas
                     SET stock = stock + $1
                     WHERE id_producto = $2 AND id_talla = $3`,
                    [item.cantidad, item.id_producto, item.id_talla]
                );
            }
        }

        await client.query('COMMIT');
        return pedido;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};


/**
 * Actualiza únicamente el comentario del vendedor en un pedido.
 * No toca el estado ni ningún otro campo — solo comentarios_vendedor.
 * Se usa desde UC-13 para que el vendedor pueda agregar o editar
 * su nota interna en cualquier momento, independientemente del estado.
 *
 * @param {number} idPedido   - ID del pedido a actualizar
 * @param {string} comentario - Texto de la nota interna (máximo 100 caracteres)
 * @returns {Object|null} El pedido actualizado, o null si no se encontró
 */
const updateComentarioVendedor = async (idPedido, comentario) => {
    const { rows } = await pool.query(
        `UPDATE pedidos
         SET comentarios_vendedor = $1
         WHERE id_pedido = $2
         RETURNING id_pedido, id_usuario, fecha_pedido, estado, total,
                   comentarios_cliente, comentarios_vendedor`,
        [comentario, idPedido]
    );
    return rows[0] || null;
};


/**
 * Obtiene los 5 productos con mayor cantidad total vendida en detalle_pedidos.
 * Agrega la cantidad de todas las tallas y pedidos por producto.
 * Incluye la imagen principal (orden = 1) si existe.
 *
 * @returns {Array} Lista de hasta 5 productos con id_producto, nombre, imagen_url y total_vendido
 */
const findTopProductos = async () => {
    const { rows } = await pool.query(
        `SELECT
           dp.id_producto,
           pr.nombre,
           (SELECT url_imagen
            FROM   imagen_producto
            WHERE  id_producto = dp.id_producto
            ORDER  BY orden, id_imagen
            LIMIT  1) AS imagen_url,
           SUM(dp.cantidad) AS total_vendido
         FROM detalle_pedidos dp
         JOIN productos pr ON pr.id_producto = dp.id_producto
         GROUP BY dp.id_producto, pr.nombre
         ORDER BY total_vendido DESC
         LIMIT 5`
    );
    return rows;
};


/**
 * Asigna fecha y hora de entrega a un pedido en 'pendiente_programacion'
 * y avanza automáticamente su estado a 'esperando_dia_entrega'.
 * Solo lo puede ejecutar Vendedor o Admin.
 *
 * @param {number} idPedido         - ID del pedido a programar
 * @param {string} fechaHoraEntrega - Fecha y hora ISO 8601
 * @returns {Object|null} El pedido actualizado, o null si no aplica
 */
const programarEntrega = async (idPedido, fechaHoraEntrega) => {
    const { rows } = await pool.query(
        `UPDATE pedidos
         SET fecha_hora_entrega = $1, estado = 'esperando_dia_entrega'
         WHERE id_pedido = $2 AND estado = 'pendiente_programacion'
         RETURNING id_pedido, id_usuario, fecha_pedido, estado, total,
                   fecha_hora_entrega, comentarios_cliente, comentarios_vendedor`,
        [fechaHoraEntrega, idPedido]
    );
    return rows[0] || null;
};


module.exports = {
    createPedido,
    findPedidosByUsuario,
    findPedidoByIdAndUsuario,
    findPedidoById,
    findAllPedidos,
    updateEstadoPedido,
    updateComentarioVendedor,
    cancelarPedido,
    findTopProductos,
    programarEntrega,
};
