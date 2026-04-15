const express = require('express');
const router = express.Router();

const {
  getCarrito,
  agregarItem,
  actualizarItem,
  eliminarItem,
  vaciarCarrito,
} = require('../controllers/carrito.controller');

const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas del carrito son exclusivas del CLIENTE autenticado.

// GET  /api/carrito                           → devuelve el carrito con items
router.get('/', verificarToken, verificarRol('CLIENTE'), getCarrito);

// POST /api/carrito/items                     → agrega / suma un item
router.post('/items', verificarToken, verificarRol('CLIENTE'), agregarItem);

// PUT  /api/carrito/items/:id_producto/:id_talla → actualiza cantidad exacta
router.put('/items/:id_producto/:id_talla', verificarToken, verificarRol('CLIENTE'), actualizarItem);

// DELETE /api/carrito/items/:id_producto/:id_talla → elimina un item
router.delete('/items/:id_producto/:id_talla', verificarToken, verificarRol('CLIENTE'), eliminarItem);

// DELETE /api/carrito                         → vacía todo el carrito
router.delete('/', verificarToken, verificarRol('CLIENTE'), vaciarCarrito);

module.exports = router;
