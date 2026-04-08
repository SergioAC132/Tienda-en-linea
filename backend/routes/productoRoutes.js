// routes/productoRoutes.js JACK BRANDON ESPINOSA NUÑEZ 2024-06-12
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/productoController');

// Middlewares de autenticación y roles — ya deben existir en middlewares/
// Ajustar los nombres según lo que tenga Sergio en su módulo de auth
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// CATÁLOGO PÚBLICO (Cliente autenticado) 
// UC-03 Ver catálogo de productos
router.get('/productos', verificarToken, verificarRol('CLIENTE'), ctrl.getCatalogo);

// UC-04 Ver detalle de producto
router.get('/productos/:id', verificarToken, verificarRol('CLIENTE'), ctrl.getProductoDetalle);

//  TALLAS (Vendedor / Admin) 
router.get   ('/tallas',     verificarToken, verificarRol('VENDEDOR'), ctrl.getTallas);
router.post  ('/tallas',     verificarToken, verificarRol('VENDEDOR'), ctrl.createTalla);
router.put   ('/tallas/:id', verificarToken, verificarRol('VENDEDOR'), ctrl.updateTalla);
router.delete('/tallas/:id', verificarToken, verificarRol('VENDEDOR'), ctrl.deleteTalla);

//  GESTIÓN DE PRODUCTOS (Vendedor / Admin) — UC-05 
// Listar todos (activos e inactivos)
router.get('/admin/productos', verificarToken, verificarRol('VENDEDOR'), ctrl.getAllProductos);

// Crear producto
router.post('/admin/productos', verificarToken, verificarRol('VENDEDOR'), ctrl.createProducto);

// Editar producto
router.put('/admin/productos/:id', verificarToken, verificarRol('VENDEDOR'), ctrl.updateProducto);

// Desactivar producto (soft delete)
router.patch('/admin/productos/:id/desactivar', verificarToken, verificarRol('VENDEDOR'), ctrl.desactivarProducto);

//  IMÁGENES del producto 
// Agregar imagen
router.post('/admin/productos/:id/imagenes', verificarToken, verificarRol('VENDEDOR'), ctrl.addImagen);

// Eliminar imagen y reordenar
router.delete('/admin/productos/:id/imagenes/:idImagen', verificarToken, verificarRol('VENDEDOR'), ctrl.deleteImagen);

module.exports = router;