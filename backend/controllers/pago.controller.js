const {
    createPago,
    findPagoByPedido,
    findPagosPendientes,
    confirmarPago,
    rechazarPago,
    adjuntarComprobante,
    findMetodosPago,
} = require('../models/pago.model');

// ─────────────────────────────────────────────────────────────
//  CONTROLLER DE PAGOS
//  Recibe las solicitudes ya validadas por el middleware,
//  llama al modelo correspondiente y devuelve la respuesta HTTP.
//  No contiene lógica SQL — eso queda en el modelo.
// ─────────────────────────────────────────────────────────────


/**
 * GET /api/pagos/metodos
 * UC-07 (paso 4): Devuelve la lista de métodos de pago disponibles.
 * Accesible para todos los roles autenticados.
 *
 * Responde con 200 y el arreglo de métodos, o 500 si hay error.
 */
const getMetodosPago = async (req, res) => {
    try {
        const metodos = await findMetodosPago();
        res.json(metodos);
    } catch (error) {
        console.error('Error en getMetodosPago:', error.message);
        res.status(500).json({ message: 'Error al obtener los métodos de pago.', error: error.message });
    }
};


/**
 * POST /api/pagos
 * UC-07 (pasos 9–13): Registra el método de pago del pedido y lo avanza
 * a 'esperando_pago'. Crea el registro en la tabla pagos.
 * Solo el Cliente dueño del pedido puede usar este endpoint.
 *
 * Body esperado (ya validado por validarRegistrarPago):
 *   - id_pedido      {number} ID del pedido en estado 'pendiente'
 *   - id_metodo_pago {number} ID del método de pago seleccionado
 *
 * Responde con 201 y el pago creado (incluye referencia si es transferencia),
 * o el error correspondiente si el pedido no aplica.
 */
const registrarPago = async (req, res) => {
    const { id_pedido, id_metodo_pago } = req.body;
    try {
        const idUsuario = req.usuario.id_usuario;
        const pago = await createPago(id_pedido, idUsuario, id_metodo_pago);
        res.status(201).json(pago);
    } catch (error) {
        if (error.message === 'LINK_PAGO_NO_DISPONIBLE') {
            return res.status(503).json({
                message: 'El pago por link no está disponible aún. Por favor usa efectivo o transferencia.'
            });
        }
        if (error.message === 'METODO_NO_VALIDO') {
            return res.status(400).json({ message: 'El método de pago seleccionado no existe.' });
        }
        if (error.message === 'PEDIDO_NO_VALIDO') {
            return res.status(404).json({
                message: 'Pedido no encontrado, no te pertenece, o ya no está en estado pendiente.'
            });
        }
        if (error.message === 'PAGO_DUPLICADO') {
            return res.status(409).json({ message: 'Ya existe un registro de pago para este pedido.' });
        }
        console.error('Error en registrarPago:', error.message);
        res.status(500).json({ message: 'Error al registrar el pago.', error: error.message });
    }
};


/**
 * GET /api/pagos
 * UC-10 (pasos 1–2): Lista todos los pagos con estado 'pendiente'.
 * Solo Vendedor y Admin tienen acceso.
 *
 * Responde con 200 y el arreglo de pagos pendientes, o 500 si hay error.
 */
const getPagosPendientes = async (req, res) => {
    try {
        const pagos = await findPagosPendientes();
        res.json(pagos);
    } catch (error) {
        console.error('Error en getPagosPendientes:', error.message);
        res.status(500).json({ message: 'Error al obtener los pagos pendientes.', error: error.message });
    }
};


/**
 * GET /api/pagos/pedido/:id_pedido
 * UC-08 (paso 2) / UC-11 (pasos 5–6): Obtiene el pago asociado a un pedido.
 *
 *   - CLIENTE   → solo puede ver el pago si el pedido le pertenece.
 *   - VENDEDOR  → puede consultar el pago de cualquier pedido.
 *   - ADMIN     → puede consultar el pago de cualquier pedido.
 *
 * Responde con 200 y el pago, 404 si no existe o no tiene permiso, o 500 si hay error.
 */
const getPagoByPedido = async (req, res) => {
    try {
        const idPedido = Number(req.params.id_pedido);
        const { id_usuario, rol } = req.usuario;

        const idUsuarioFiltro = rol === 'CLIENTE' ? id_usuario : null;
        const pago = await findPagoByPedido(idPedido, idUsuarioFiltro);

        if (!pago) {
            return res.status(404).json({ message: 'No se encontró un pago para este pedido.' });
        }

        res.json(pago);
    } catch (error) {
        console.error('Error en getPagoByPedido:', error.message);
        res.status(500).json({ message: 'Error al obtener el pago.', error: error.message });
    }
};


/**
 * PATCH /api/pagos/:id/comprobante
 * UC-08: Adjunta o reemplaza la imagen del comprobante de transferencia.
 * Solo el Cliente dueño del pedido puede usar este endpoint.
 *
 * Requiere multipart/form-data con el campo 'comprobante' (JPG, PNG o PDF, máx. 5 MB).
 * El archivo es procesado por multer antes de llegar aquí.
 *
 * Responde con 200 y el pago actualizado, 400 si no hay archivo,
 * 404 si el pago no aplica, o 500 si hay error.
 */
const subirComprobante = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Debes adjuntar una imagen del comprobante.' });
        }

        const idPago      = Number(req.params.id);
        const idUsuario   = req.usuario.id_usuario;
        const rutaArchivo = `/database/uploads/comprobantes/${req.file.filename}`;

        const pagoActualizado = await adjuntarComprobante(idPago, idUsuario, rutaArchivo);

        if (!pagoActualizado) {
            return res.status(404).json({
                message: 'Pago no encontrado, no te pertenece, o el estado actual no permite adjuntar comprobante.'
            });
        }

        res.json(pagoActualizado);
    } catch (error) {
        console.error('Error en subirComprobante:', error.message);
        res.status(500).json({ message: 'Error al adjuntar el comprobante.', error: error.message });
    }
};


/**
 * PATCH /api/pagos/:id/confirmar
 * UC-10 (pasos 6–9): Confirma el pago y avanza el pedido a 'pagado'.
 * Solo Vendedor y Admin pueden usar este endpoint.
 *
 * Responde con 200 y el pago confirmado, 404 si no estaba pendiente, o 500 si hay error.
 */
const confirmarPagoHandler = async (req, res) => {
    try {
        const idPago = Number(req.params.id);
        const pagoConfirmado = await confirmarPago(idPago);

        if (!pagoConfirmado) {
            return res.status(404).json({
                message: 'Pago no encontrado o ya no está en estado pendiente.'
            });
        }

        res.json({
            message: 'Pago confirmado. El pedido ha sido marcado como pagado.',
            pago: pagoConfirmado
        });
    } catch (error) {
        console.error('Error en confirmarPagoHandler:', error.message);
        res.status(500).json({ message: 'Error al confirmar el pago.', error: error.message });
    }
};


/**
 * PATCH /api/pagos/:id/rechazar
 * UC-10 (pasos 6a–6b): Rechaza el pago. El pedido permanece en 'esperando_pago'
 * para que el cliente pueda adjuntar un nuevo comprobante (UC-08).
 * Solo Vendedor y Admin pueden usar este endpoint.
 *
 * Responde con 200 y el pago rechazado, 404 si no estaba pendiente, o 500 si hay error.
 */
const rechazarPagoHandler = async (req, res) => {
    try {
        const idPago = Number(req.params.id);
        const pagoRechazado = await rechazarPago(idPago);

        if (!pagoRechazado) {
            return res.status(404).json({
                message: 'Pago no encontrado o ya no está en estado pendiente.'
            });
        }

        res.json({
            message: 'Pago rechazado. El pedido permanece en espera de pago.',
            pago: pagoRechazado
        });
    } catch (error) {
        console.error('Error en rechazarPagoHandler:', error.message);
        res.status(500).json({ message: 'Error al rechazar el pago.', error: error.message });
    }
};


module.exports = {
    getMetodosPago,
    registrarPago,
    getPagosPendientes,
    getPagoByPedido,
    subirComprobante,
    confirmarPagoHandler,
    rechazarPagoHandler,
};
