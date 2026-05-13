const axios = require('axios');

// ─────────────────────────────────────────────────────────────
//  SERVICIO DE CLIP
//  Llama al endpoint POST /v2/checkout de la API de Clip para
//  generar un link de pago asociado a un pedido.
// ─────────────────────────────────────────────────────────────

/**
 * Genera un link de pago en Clip para el pedido indicado.
 *
 * @param {number|string} idPedido - ID del pedido
 * @param {number|string} monto    - Monto total del pedido en MXN
 * @returns {{ payment_request_url: string, payment_request_id: string }}
 */
const generarLinkPago = async (idPedido, monto) => {
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

    const { data } = await axios.post(
        'https://api.payclip.com/v2/checkout',
        {
            amount:               Number(monto),
            currency:             'MXN',
            purchase_description: `Pedido #${idPedido}`,
            redirection_url: {
                success: `${appUrl}/views/pedidos.html?pago=completado`,
                error:   `${appUrl}/views/pago.html?pedidoId=${idPedido}`,
                default: `${appUrl}/views/pedidos.html`,
            },
            custom_payment_options: {
                payment_method_types: [`credit`, `debit`, `cash`]
            },
            expires_at: new Date(Date.now() + 3600 * 24000).toISOString(),
            metadata: {
                external_reference: String(idPedido),
            },
            webhook_url: `${appUrl}/webhooks/clip`,
        },
        {
            headers: {
                'Authorization': `Basic ${process.env.CLIP_API_KEY}`,
                'Content-Type':  'application/json',
            },
        }
    );

    console.log('Respuesta completa de Clip:', JSON.stringify(data, null, 2));

    return {
        payment_request_url: data.payment_request_url,
        payment_request_id:  data.payment_request_id,
    };
};

module.exports = { generarLinkPago };
