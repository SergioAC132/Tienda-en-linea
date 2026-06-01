const express   = require('express');
const router    = express.Router();
const { clipWebhook } = require('../controllers/webhook.controller');

// ─────────────────────────────────────────────────────────────
//  RUTAS DE WEBHOOKS
//  Endpoints llamados por servicios externos (no por el frontend).
//  No requieren autenticación JWT.
// ─────────────────────────────────────────────────────────────

// POST /webhooks/clip
// Notificación de Clip al completarse un pago (status CHECKOUT_COMPLETED).
router.post('/clip', clipWebhook);

module.exports = router;
