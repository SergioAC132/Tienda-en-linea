// routes/productoRoutes.js JACK BRANDON ESPINOSA NUÑEZ 2024-06-12
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const ctrl    = require('../controllers/productoController');

const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// ─── Multer (subida de imágenes) ───────────────────────────────
const uploadDir = path.join(__dirname, '..', '..', 'database', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req,  file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `img-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// CATÁLOGO PÚBLICO — sin autenticación requerida
// UC-03 Ver catálogo de productos
router.get('/productos', ctrl.getCatalogo);

// UC-04 Ver detalle de producto
router.get('/productos/:id', ctrl.getProductoDetalle);

//  TALLAS (Vendedor / Admin)
router.get   ('/tallas',          verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.getTallas);
router.post  ('/tallas',          verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.createTalla);
router.put   ('/tallas/:id',      verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.updateTalla);
router.delete('/tallas/:id',      verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.deleteTalla);
router.patch ('/tallas/:id/orden',verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.swapOrdenTallas);

//  GESTIÓN DE PRODUCTOS (Vendedor / Admin) — UC-05
// Listar todos (activos e inactivos)
router.get('/admin/productos', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.getAllProductos);

// Detalle completo de un producto para el panel admin (sin filtro activo)
router.get('/admin/productos/:id', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.getProductoAdminById);

// Crear producto
router.post('/admin/productos', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.createProducto);

// Editar producto
router.put('/admin/productos/:id', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.updateProducto);

// Desactivar producto (soft delete)
router.patch('/admin/productos/:id/desactivar', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.desactivarProducto);

// Actualizar stock de una talla
router.patch('/admin/productos/:id/tallas/:idTalla/stock', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.updateStockTalla);

//  IMÁGENES del producto
// Agregar imagen (con soporte multer para upload de archivo)
router.post(
  '/admin/productos/:id/imagenes',
  verificarToken, verificarRol('VENDEDOR', 'ADMIN'),
  upload.single('imagen'),
  ctrl.addImagen
);

// Eliminar imagen y reordenar
router.delete('/admin/productos/:id/imagenes/:idImagen', verificarToken, verificarRol('VENDEDOR', 'ADMIN'), ctrl.deleteImagen);

module.exports = router;
