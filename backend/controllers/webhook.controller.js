const { confirmarPagoPorReferencia } = require('../models/pago.model');

// ─────────────────────────────────────────────────────────────
//  CONTROLLER DE WEBHOOKS
//  Recibe notificaciones de servicios externos (Clip).
//  No requiere autenticación JWT — la validación es por origen.
// ─────────────────────────────────────────────────────────────


/**
 * POST /webhooks/clip
 * Recibe la notificación de Clip cuando un pago se completa.
 * Cuando status = CHECKOUT_COMPLETED, busca el pago por payment_request_id
 * (almacenado en el campo referencia), confirma el pago y marca el pedido como 'pagado'.
 *
 * Responde 200 en todos los casos para que Clip no reintente el envío.
 */
const clipWebhook = async (req, res) => {
    try {
        const { status, payment_request_id } = req.body;

        if (status !== 'CHECKOUT_COMPLETED') {
            return res.status(200).json({ received: true });
        }

        if (!payment_request_id) {
            return res.status(400).json({ message: 'Falta payment_request_id.' });
        }

        const pago = await confirmarPagoPorReferencia(payment_request_id);

        if (!pago) {
            return res.status(404).json({ message: 'Pago no encontrado o ya procesado.' });
        }

        res.json({ message: 'Pago confirmado.', pago });
    } catch (error) {
        console.error('Error en clipWebhook:', error.message);
        res.status(500).json({ message: 'Error al procesar el webhook.' });
    }
};

module.exports = { clipWebhook };
