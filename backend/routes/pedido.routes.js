const express = require('express');
const router = express.Router();

const { crearPedido, getPedidos, getPedidoById, actualizarEstado, cancelarPedidoPropio, iniciarPago, agregarComentario, getTopProductos } = require('../controllers/pedido.controller');

const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const { validarCrearPedido, validarActualizarEstado, validarComentario } = require('../middlewares/pedido.middleware');

// ─────────────────────────────────────────────────────────────
//  RUTAS DE PEDIDOS
//  Todas las rutas requieren token JWT (verificarToken).
//  Algunas además restringen el acceso por rol (verificarRol).
//
//  Orden de middlewares en cada ruta:
//    1. verificarToken      → verifica que el JWT sea válido
//    2. verificarRol(...)   → verifica que el rol tenga permiso (si aplica)
//    3. validar...          → valida el body (si aplica)
//    4. controller          → ejecuta la lógica y responde
// ─────────────────────────────────────────────────────────────


// POST /api/pedidos
// Crea un nuevo pedido. Solo el Cliente puede crear pedidos.
router.post( '/', verificarToken, verificarRol('CLIENTE'), validarCrearPedido, crearPedido );


// GET /api/pedidos
// Obtiene pedidos según el rol:
//   - CLIENTE   → sus propios pedidos
//   - VENDEDOR  → todos los pedidos del sistema
//   - ADMIN     → todos los pedidos del sistema
router.get( '/', verificarToken, verificarRol('CLIENTE', 'VENDEDOR', 'ADMIN'), getPedidos );


// GET /api/pedidos/top-productos
// Devuelve los 5 productos con mayor cantidad total vendida en detalle_pedidos.
// Solo Vendedor y Admin tienen acceso (usado en el dashboard).
// IMPORTANTE: debe declararse antes de /:id para que Express no lo trate como parámetro.
router.get( '/top-productos', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), getTopProductos );


// GET /api/pedidos/:id
// Obtiene el detalle completo de un pedido (incluye detalle_pedidos).
// CLIENTE → solo su propio pedido. VENDEDOR / ADMIN → cualquier pedido.
router.get( '/:id', verificarToken, verificarRol('CLIENTE', 'VENDEDOR', 'ADMIN'), getPedidoById );


// PATCH /api/pedidos/:id/estado
// Actualiza el estado de un pedido.
// Solo Vendedor y Admin tienen este permiso.
router.patch( '/:id/estado', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), validarActualizarEstado, actualizarEstado );


// PATCH /api/pedidos/:id/cancelar
// Cancela un pedido propio. Solo el Cliente puede cancelar sus pedidos.
// El modelo solo permite cancelar si el estado es 'pendiente'.
router.patch( '/:id/cancelar', verificarToken, verificarRol('CLIENTE'), cancelarPedidoPropio );


// PATCH /api/pedidos/:id/pagar
// Avanza el estado del pedido de 'pendiente' a 'esperando_pago'.
// Se llama desde pago.js cuando el cliente registra su intención de pago.
// No requiere body — el id_usuario se obtiene del token JWT.
router.patch( '/:id/pagar', verificarToken, verificarRol('CLIENTE'), iniciarPago );


// PATCH /api/pedidos/:id/comentario
// Agrega o edita el comentario interno del vendedor en un pedido.
// No modifica el estado — solo actualiza comentarios_vendedor.
// Solo Vendedor y Admin tienen este permiso.
router.patch( '/:id/comentario', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), validarComentario, agregarComentario );


module.exports = router;
