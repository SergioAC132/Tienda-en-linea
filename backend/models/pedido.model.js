const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────
//  MODELO DE PEDIDOS
//  Contiene todas las consultas SQL relacionadas con la tabla
//  `pedidos`. Cada función recibe parámetros ya validados y
//  devuelve los datos directamente desde la base de datos.
// ─────────────────────────────────────────────────────────────


/**
 * Crea un nuevo pedido para el usuario autenticado.
 * El estado se establece automáticamente como 'pendiente'
 * y la fecha como el momento actual (NOW()).
 *
 * @param {number} idUsuario        - ID del cliente que hace el pedido (viene del token JWT)
 * @param {number} total            - Total del pedido calculado desde el carrito en el frontend
 * @param {string|null} comentarios - Comentarios opcionales del cliente
 * @returns {Object} El pedido recién creado con todos sus campos
 */
const createPedido = async (idUsuario, total, comentarios) => {
    const { rows } = await pool.query(
        `INSERT INTO pedidos (id_usuario, fecha_pedido, estado, total, comentarios_cliente)
         VALUES ($1, NOW(), 'pendiente', $2, $3)
         RETURNING id_pedido, id_usuario, fecha_pedido, estado, total, comentarios_cliente, comentarios_vendedor`,
        [idUsuario, total, comentarios || null] //REVISAR
    );
    return rows[0];
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
 * Obtiene un pedido específico por su ID.
 * Incluye verificación de que el pedido pertenezca al usuario
 * que lo solicita, para evitar que un cliente vea pedidos ajenos.
 *
 * @param {number} idPedido  - ID del pedido a buscar
 * @param {number} idUsuario - ID del cliente autenticado (verificación de pertenencia)
 * @returns {Object|null} El pedido encontrado, o null si no existe o no pertenece al usuario
 */
const findPedidoByIdAndUsuario = async (idPedido, idUsuario) => {
    const { rows } = await pool.query(
        `SELECT id_pedido, id_usuario, fecha_pedido, estado, total,
                comentarios_cliente, comentarios_vendedor
         FROM pedidos
         WHERE id_pedido = $1 AND id_usuario = $2`,
        [idPedido, idUsuario]
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
 * @param {number} idPedido  - ID del pedido a cancelar
 * @param {number} idUsuario - ID del cliente (verifica que sea su propio pedido)
 * @returns {Object|null} El pedido cancelado, o null si no se encontró o no era cancelable
 */
const cancelarPedido = async (idPedido, idUsuario) => {
    const { rows } = await pool.query(
        `UPDATE pedidos
         SET estado = 'cancelado'
         WHERE id_pedido = $1
           AND id_usuario = $2
           AND estado = 'pendiente'
         RETURNING id_pedido, id_usuario, fecha_pedido, estado, total,
                   comentarios_cliente, comentarios_vendedor`,
        [idPedido, idUsuario]
    );
    return rows[0] || null;
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
 * Avanza el estado de un pedido de 'pendiente' a 'esperando_pago'.
 * Se llama cuando el cliente registra su intención de pago desde pago.js.
 * Solo aplica si el pedido pertenece al usuario y está en estado 'pendiente',
 * ya que no tiene sentido avanzar un pedido que ya fue pagado o cancelado.
 *
 * @param {number} idPedido  - ID del pedido a actualizar
 * @param {number} idUsuario - ID del cliente autenticado (verifica que sea su pedido)
 * @returns {Object|null} El pedido actualizado, o null si no se encontró o no era 'pendiente'
 */
const iniciarPagoPedido = async (idPedido, idUsuario) => {
    const { rows } = await pool.query(
        `UPDATE pedidos
         SET estado = 'esperando_pago'
         WHERE id_pedido = $1
           AND id_usuario = $2
           AND estado = 'pendiente'
         RETURNING id_pedido, id_usuario, fecha_pedido, estado, total,
                   comentarios_cliente, comentarios_vendedor`,
        [idPedido, idUsuario]
    );
    return rows[0] || null;
};


module.exports = {
    createPedido,
    findPedidosByUsuario,
    findPedidoByIdAndUsuario,
    findAllPedidos,
    updateEstadoPedido,
    updateComentarioVendedor,
    cancelarPedido,
    iniciarPagoPedido,
};
