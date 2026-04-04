const express = require('express');
const router = express.Router();
const { getDirecciones, crearDireccion, modificarDireccion } = require('../controllers/direccion.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { validarDireccion } = require('../middlewares/direccion.middleware');

router.get('/', verificarToken, getDirecciones);
router.post('/', verificarToken, validarDireccion, crearDireccion);
router.put('/:idDireccion', verificarToken, validarDireccion, modificarDireccion);

module.exports = router;
