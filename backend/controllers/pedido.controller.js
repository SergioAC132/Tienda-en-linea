const { createPedido, findPedidosByUsuario, findPedidoByIdAndUsuario, findPedidoById, findAllPedidos, updateEstadoPedido, updateComentarioVendedor, cancelarPedido, iniciarPagoPedido, findTopProductos } = require('../models/pedido.model');

// ─────────────────────────────────────────────────────────────
//  CONTROLLER DE PEDIDOS
//  Recibe las solicitudes ya validadas por el middleware,
//  llama al modelo correspondiente y devuelve la respuesta HTTP.
//  No contiene lógica SQL — eso queda en el modelo.
// ─────────────────────────────────────────────────────────────


/**
 * POST /api/pedidos
 * Crea un nuevo pedido para el cliente autenticado.
 * El estado se establece como 'pendiente' automáticamente en el modelo.
 *
 * Body esperado (ya validado por validarCrearPedido):
 *   - total        {number}  Total del pedido
 *   - comentarios  {string}  (opcional) Comentarios del cliente
 *
 * Responde con 201 y el pedido creado, o 500 si ocurre un error inesperado.
 */
const crearPedido = async (req, res) => {
    const { total, id_direccion, comentarios } = req.body;
    try {
        const idUsuario = req.usuario.id_usuario;
        const nuevoPedido = await createPedido(idUsuario, total, id_direccion, comentarios);
        res.status(201).json(nuevoPedido);
    } catch (error) {
        if (error.message && error.message.startsWith('Stock insuficiente')) {
            return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error al crear el pedido.', error: error.message });
    }
};


/**
 * GET /api/pedidos
 * Comportamiento diferente según el rol del usuario autenticado:
 *
 *   - CLIENTE   → devuelve únicamente sus propios pedidos (filtrado por id_usuario del token)
 *   - VENDEDOR  → devuelve todos los pedidos del sistema con datos del cliente
 *   - ADMIN     → igual que VENDEDOR
 *
 * No requiere body. El rol se lee del token JWT (req.usuario.rol).
 * Responde con 200 y la lista de pedidos, o 500 si ocurre un error inesperado.
 */
const getPedidos = async (req, res) => {
    try {
        const { id_usuario, rol } = req.usuario;

        if (rol === 'CLIENTE') {
            // El cliente solo ve sus propios pedidos
            const pedidos = await findPedidosByUsuario(id_usuario);
            return res.json(pedidos);
        }

        // Vendedor y Admin ven todos los pedidos del sistema
        const pedidos = await findAllPedidos();
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los pedidos.', error: error.message });
    }
};


/**
 * GET /api/pedidos/:id
 * Devuelve el detalle de un pedido específico.
 * Solo el cliente dueño del pedido puede consultarlo.
 * Si el pedido no existe o pertenece a otro usuario, responde con 404.
 *
 * Params:
 *   - id  {number}  ID del pedido a consultar
 *
 * Responde con 200 y el pedido, 404 si no se encuentra, o 500 si hay error.
 */
const getPedidoById = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario, rol } = req.usuario;

        // CLIENTE solo puede ver sus propios pedidos.
        // VENDEDOR y ADMIN pueden ver cualquier pedido.
        let pedido;
        if (rol === 'CLIENTE') {
            pedido = await findPedidoByIdAndUsuario(id, id_usuario);
        } else {
            pedido = await findPedidoById(id);
        }

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        res.json(pedido);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el pedido.', error: error.message });
    }
};


/**
 * PATCH /api/pedidos/:id/estado
 * Actualiza el estado de un pedido. Solo Vendedor y Admin pueden usarlo.
 * Opcionalmente puede agregar o actualizar el comentario del vendedor.
 * Si el pedido no existe, responde con 404.
 *
 * Params:
 *   - id  {number}  ID del pedido a actualizar
 *
 * Body esperado (ya validado por validarActualizarEstado):
 *   - estado               {string}  Nuevo estado del pedido
 *   - comentarios_vendedor {string}  (opcional) Comentario del vendedor
 *
 * Responde con 200 y el pedido actualizado, 404 si no existe, o 500 si hay error.
 */
const actualizarEstado = async (req, res) => {
    const { estado, comentarios_vendedor } = req.body;
    try {
        const { id } = req.params;
        const pedidoActualizado = await updateEstadoPedido(id, estado, comentarios_vendedor);

        if (!pedidoActualizado) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        res.json(pedidoActualizado);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el estado del pedido.', error: error.message });
    }
};


/**
 * PATCH /api/pedidos/:id/cancelar
 * Permite al cliente cancelar uno de sus propios pedidos.
 * Solo se puede cancelar si el pedido está en estado 'pendiente'.
 * Si ya pasó a otro estado, el modelo no lo toca y responde con 404.
 *
 * Params:
 *   - id  {number}  ID del pedido a cancelar
 *
 * No requiere body. El id_usuario se obtiene del token JWT.
 * Responde con 200 y el pedido cancelado, 404 si no aplica, o 500 si hay error.
 */
const cancelarPedidoPropio = async (req, res) => {
    try {
        const { id } = req.params;
        const idUsuario = req.usuario.id_usuario;
        const pedidoCancelado = await cancelarPedido(id, idUsuario);

        if (!pedidoCancelado) {
            return res.status(404).json({
                message: 'Pedido no encontrado, no te pertenece, o ya no puede cancelarse porque superó el estado pendiente.'
            });
        }

        res.json(pedidoCancelado);
    } catch (error) {
        res.status(500).json({ message: 'Error al cancelar el pedido.', error: error.message });
    }
};


/**
 * PATCH /api/pedidos/:id/pagar
 * Avanza el estado del pedido de 'pendiente' a 'esperando_pago'.
 * Se llama desde pago.js cuando el cliente registra su intención de pago.
 * Solo el cliente dueño del pedido puede usarlo, y únicamente si el pedido
 * sigue en estado 'pendiente' — el modelo rechaza cualquier otro caso.
 *
 * Params:
 *   - id  {number}  ID del pedido a actualizar
 *
 * No requiere body. El id_usuario se obtiene del token JWT.
 * Responde con 200 y el pedido actualizado, 404 si no aplica, o 500 si hay error.
 */
const iniciarPago = async (req, res) => {
    try {
        const { id } = req.params;
        const idUsuario = req.usuario.id_usuario;
        const pedidoActualizado = await iniciarPagoPedido(id, idUsuario);

        if (!pedidoActualizado) {
            return res.status(404).json({
                message: 'Pedido no encontrado, no te pertenece, o ya no está en estado pendiente.'
            });
        }

        res.json(pedidoActualizado);
    } catch (error) {
        res.status(500).json({ message: 'Error al iniciar el pago del pedido.', error: error.message });
    }
};


/**
 * PATCH /api/pedidos/:id/comentario
 * Agrega o edita el comentario interno del vendedor en un pedido.
 * No modifica el estado ni ningún otro campo — solo comentarios_vendedor.
 * Solo disponible para Vendedor y Admin.
 *
 * Params:
 *   - id  {number}  ID del pedido a actualizar
 *
 * Body esperado (ya validado por validarComentario):
 *   - comentario {string} Texto de la nota interna (máximo 100 caracteres)
 *
 * Responde con 200 y el pedido actualizado, 404 si no existe, o 500 si hay error.
 */
const agregarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario } = req.body;
        const pedidoActualizado = await updateComentarioVendedor(id, comentario);

        if (!pedidoActualizado) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        res.json(pedidoActualizado);
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el comentario.', error: error.message });
    }
};


/**
 * GET /api/pedidos/top-productos
 * Devuelve los 5 productos con mayor cantidad total vendida en detalle_pedidos.
 * Solo accesible para Vendedor y Admin (usado en el dashboard).
 *
 * Responde con 200 y el arreglo de productos, o 500 si ocurre un error inesperado.
 */
const getTopProductos = async (req, res) => {
    try {
        const top = await findTopProductos();
        res.json(top);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el top de productos.', error: error.message });
    }
};


module.exports = {
    crearPedido,
    getPedidos,
    getPedidoById,
    actualizarEstado,
    cancelarPedidoPropio,
    iniciarPago,
    agregarComentario,
    getTopProductos,
};
