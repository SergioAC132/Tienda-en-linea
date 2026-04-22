const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');

const {
    getMetodosPago,
    registrarPago,
    getPagosPendientes,
    getPagoByPedido,
    subirComprobante,
    confirmarPagoHandler,
    rechazarPagoHandler,
} = require('../controllers/pago.controller');

const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validarRegistrarPago }         = require('../middlewares/pago.middleware');

// ─── Multer (comprobantes de pago) ────────────────────────────
// Los comprobantes se guardan en database/uploads/comprobantes/
// y quedan accesibles en /database/uploads/comprobantes/<archivo>
// gracias al middleware static ya registrado en server.js.
const comprobanteDir = path.join(__dirname, '..', '..', 'database', 'uploads', 'comprobantes');
if (!fs.existsSync(comprobanteDir)) fs.mkdirSync(comprobanteDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, comprobanteDir),
    filename:    (_req,  file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `comprobante-${Date.now()}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const permitidos = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (permitidos.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('FORMATO_NO_VALIDO'), false);
    }
};

const upload = multer({
    storage,
    limits:     { fileSize: 5 * 1024 * 1024 },
    fileFilter,
});

// Convierte errores de multer en respuestas 400 legibles.
// Al tener 4 parámetros, Express lo trata como error-handler y lo
// invoca solo cuando upload.single() llama a next(err).
const manejarErrorMulter = (err, _req, res, next) => {
    if (!err) return next();
    if (err.message === 'FORMATO_NO_VALIDO') {
        return res.status(400).json({ message: 'Formato de archivo no permitido. Usa JPG, PNG o PDF.' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'El archivo no debe exceder 5 MB.' });
    }
    return res.status(400).json({ message: 'Error al procesar el archivo adjunto.' });
};

// ─────────────────────────────────────────────────────────────
//  RUTAS DE PAGOS
//  Orden de middlewares en cada ruta:
//    1. verificarToken      → valida el JWT
//    2. verificarRol(...)   → verifica el rol del usuario
//    3. validar...          → valida el body (cuando aplica)
//    4. controller          → ejecuta la lógica y responde
//
//  IMPORTANTE: las rutas con segmento fijo (/metodos, /pedido/:x)
//  deben declararse ANTES de las rutas con parámetro genérico (/:id)
//  para que Express no las trate como un id.
// ─────────────────────────────────────────────────────────────


// GET /api/pagos/metodos
// UC-07 (paso 4): Devuelve los métodos de pago disponibles.
// Accesible para todos los roles autenticados.
router.get('/metodos',
    verificarToken,
    verificarRol('CLIENTE', 'VENDEDOR', 'ADMIN'),
    getMetodosPago
);


// GET /api/pagos
// UC-10 (pasos 1–2): Lista los pagos con estado 'pendiente'.
// Solo Vendedor y Admin tienen acceso.
router.get('/',
    verificarToken,
    verificarRol('VENDEDOR', 'ADMIN'),
    getPagosPendientes
);


// POST /api/pagos
// UC-07 (pasos 9–13): Registra el método de pago y avanza el pedido a 'esperando_pago'.
// Solo el Cliente puede registrar su propio pago.
router.post('/',
    verificarToken,
    verificarRol('CLIENTE'),
    validarRegistrarPago,
    registrarPago
);


// GET /api/pagos/pedido/:id_pedido
// UC-08 (paso 2) / UC-11 (pasos 5–6): Obtiene el pago de un pedido.
// CLIENTE → solo su propio pago. VENDEDOR / ADMIN → cualquier pago.
// Declarada antes de /:id para evitar que Express trate 'pedido' como un id.
router.get('/pedido/:id_pedido',
    verificarToken,
    verificarRol('CLIENTE', 'VENDEDOR', 'ADMIN'),
    getPagoByPedido
);


// PATCH /api/pagos/:id/comprobante
// UC-08: Adjunta o reemplaza la imagen del comprobante de transferencia.
// Solo el Cliente dueño del pedido puede adjuntar.
router.patch('/:id/comprobante',
    verificarToken,
    verificarRol('CLIENTE'),
    upload.single('comprobante'),
    manejarErrorMulter,
    subirComprobante
);


// PATCH /api/pagos/:id/confirmar
// UC-10 (pasos 6–9): Confirma el pago y avanza el pedido a 'pagado'.
// Solo Vendedor y Admin tienen acceso.
router.patch('/:id/confirmar',
    verificarToken,
    verificarRol('VENDEDOR', 'ADMIN'),
    confirmarPagoHandler
);


// PATCH /api/pagos/:id/rechazar
// UC-10 (pasos 6a–6b): Rechaza el pago. El pedido permanece en 'esperando_pago'.
// Solo Vendedor y Admin tienen acceso.
router.patch('/:id/rechazar',
    verificarToken,
    verificarRol('VENDEDOR', 'ADMIN'),
    rechazarPagoHandler
);


module.exports = router;
