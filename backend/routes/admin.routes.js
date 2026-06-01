const express        = require('express');
const router         = express.Router();
const adminController = require('../controllers/admin.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// GET /api/admin/usuarios — lista todos los usuarios
router.get('/usuarios', verificarToken, verificarRol('ADMIN'), adminController.getUsuarios);

// PATCH /api/admin/usuarios/:id/estado — activa/desactiva un usuario
router.patch('/usuarios/:id/estado', verificarToken, verificarRol('ADMIN'), adminController.toggleEstado);

// POST /api/admin/usuarios — crea un usuario con rol VENDEDOR o ADMIN
router.post('/usuarios', verificarToken, verificarRol('ADMIN'), adminController.crearUsuario);

// GET /api/admin/puntos-entrega — clientes ven activos, admin ve todos
router.get('/puntos-entrega', verificarToken, adminController.getPuntosEntrega);

// POST /api/admin/puntos-entrega — crea un punto de entrega
router.post('/puntos-entrega', verificarToken, verificarRol('ADMIN'), adminController.crearPuntoEntrega);

// PATCH /api/admin/puntos-entrega/:id/estado — activa/desactiva un punto
router.patch('/puntos-entrega/:id/estado', verificarToken, verificarRol('ADMIN'), adminController.toggleActivoPunto);

module.exports = router;
