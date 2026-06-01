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
    console.log("Holaaaaaaaaamdnkjsb")
    res.status(200).json({ received: true });

    try {
        console.log('WEBHOOK BODY:', JSON.stringify(req.body, null, 2));

        const status = req.body.status || req.body.data?.status;
        const payment_request_id =
            req.body.payment_request_id ||
            req.body.data?.payment_request_id;

        console.log('status:', status);
        console.log('payment_request_id:', payment_request_id);

        if (status !== 'CHECKOUT_COMPLETED') {
            console.log('Evento ignorado');
            return;
        }

        if (!payment_request_id) {
            console.log('Sin payment_request_id');
            return;
        }

        const pago = await confirmarPagoPorReferencia(payment_request_id);

        console.log('Pago confirmado:', pago);

    } catch (error) {
        console.error('clipWebhook error:', error);
    }
};

module.exports = { clipWebhook };
