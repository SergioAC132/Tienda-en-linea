const express        = require('express');
const router         = express.Router();
const adminController = require('../controllers/admin.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// GET /api/admin/usuarios — lista todos los usuarios
router.get('/usuarios', verificarToken, verificarRol('ADMIN'), adminController.getUsuarios);

// PATCH /api/admin/usuarios/:id/estado — activa/desactiva un usuario
router.patch('/usuarios/:id/estado', verificarToken, verificarRol('ADMIN'), adminController.toggleEstado);

module.exports = router;
