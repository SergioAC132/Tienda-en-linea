// controllers/productoController.js  JACK BRANDON ESPINOSA NUÑEZ 2024-06-12
const productoModel = require('../models/productoModel');
const tallaModel    = require('../models/tallaModel');

// CATÁLOGO (Cliente)

// GET /api/productos  — UC-03
const getCatalogo = async (req, res) => {
  try {
    const productos = await productoModel.getProductosCatalogo();
    if (productos.length === 0) {
      return res.status(200).json({ mensaje: 'El catálogo está vacío por el momento.', productos: [] });
    }
    res.json(productos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el catálogo.' });
  }
};

// GET /api/productos/:id  — UC-04
const getProductoDetalle = async (req, res) => {
  try {
    const producto = await productoModel.getProductoById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(producto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto.' });
  }
};

// PANEL ADMIN/VENDEDOR 

// GET /api/admin/productos  — UC-05 (todos, activos e inactivos)
const getAllProductos = async (req, res) => {
  try {
    const productos = await productoModel.getAllProductos();
    res.json(productos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los productos.' });
  }
};

// POST /api/admin/productos  — UC-05 crear
const createProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas, tallas_stock } = req.body;

    // Campos requeridos
    if (!nombre || !precio_base) {
      return res.status(400).json({ error: 'Los campos nombre y precio_base son requeridos.' });
    }

    const result = await productoModel.createProducto({ nombre, descripcion, precio_base, disponible, activo, fecha_publicacion });
    if (result.error) return res.status(409).json({ error: result.error });

    const producto = result.producto;

    // tallas_stock ([{ id_talla, stock }]) tiene precedencia sobre ids_tallas ([id_talla, ...])
    const tallasData = tallas_stock || ids_tallas;
    if (tallasData && tallasData.length > 0) {
      await productoModel.setTallasProducto(producto.id_producto, tallasData);
    }

    res.status(201).json({ mensaje: 'Producto guardado exitosamente.', producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el producto.' });
  }
};

// PUT /api/admin/productos/:id  — UC-05 editar
const updateProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas, tallas_stock } = req.body;

    const result = await productoModel.updateProducto(req.params.id, { nombre, descripcion, precio_base, disponible, activo, fecha_publicacion });
    if (!result.producto) return res.status(404).json({ error: 'Producto no encontrado.' });
    if (result.error)    return res.status(409).json({ error: result.error });

    // tallas_stock tiene precedencia sobre ids_tallas
    const tallasData = tallas_stock !== undefined ? tallas_stock : ids_tallas;
    if (tallasData !== undefined) {
      await productoModel.setTallasProducto(req.params.id, tallasData);
    }

    res.json({ mensaje: 'Producto actualizado correctamente.', producto: result.producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el producto.' });
  }
};

// PATCH /api/admin/productos/:id/tallas/:idTalla/stock
const updateStockTalla = async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock === null || isNaN(+stock) || +stock < 0) {
      return res.status(400).json({ error: 'El stock debe ser un número mayor o igual a 0.' });
    }
    const row = await productoModel.updateStockTalla(req.params.id, req.params.idTalla, +stock);
    if (!row) return res.status(404).json({ error: 'Relación producto-talla no encontrada.' });
    res.json({ mensaje: 'Stock actualizado.', ...row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el stock.' });
  }
};

// PATCH /api/admin/productos/:id/desactivar  — UC-05 flujo alt. 10b
const desactivarProducto = async (req, res) => {
  try {
    const producto = await productoModel.desactivarProducto(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json({ mensaje: 'Producto desactivado. Ya no aparece en el catálogo.', producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar el producto.' });
  }
};

//  IMÁGENES 

// GET /api/admin/productos/:id  — detalle completo para vendedor/admin
const getProductoAdminById = async (req, res) => {
  try {
    const producto = await productoModel.getProductoAdminById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(producto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto.' });
  }
};

// POST /api/admin/productos/:id/imagenes
// Espera que el middleware de multer ya haya procesado el archivo
const addImagen = async (req, res) => {
  try {
    const { orden } = req.body;
    const ruta_imagen = req.file ? `/database/uploads/${req.file.filename}` : req.body.ruta_imagen;

    if (!ruta_imagen) return res.status(400).json({ error: 'Debes adjuntar una imagen.' });

    const imagen = await productoModel.addImagen(req.params.id, ruta_imagen, orden || 1);
    res.status(201).json({ mensaje: 'Imagen agregada.', imagen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar la imagen.' });
  }
};

// DELETE /api/admin/productos/:id/imagenes/:idImagen  — UC-05 flujo alt. 10a
const deleteImagen = async (req, res) => {
  try {
    await productoModel.deleteImagen(req.params.idImagen, req.params.id);
    res.json({ mensaje: 'Imagen eliminada y orden actualizado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la imagen.' });
  }
};

// TALLAS (CRUD independiente) 

// GET /api/tallas
const getTallas = async (req, res) => {
  try {
    const tallas = await tallaModel.getAllTallas();
    res.json(tallas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tallas.' });
  }
};

// POST /api/tallas
const createTalla = async (req, res) => {
  try {
    const { nombre, es_ninio, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El campo nombre es requerido.' });
    const talla = await tallaModel.createTalla(nombre, es_ninio ?? false, descripcion ?? null);
    res.status(201).json({ mensaje: 'Talla creada.', talla });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la talla.' });
  }
};

// PUT /api/tallas/:id
const updateTalla = async (req, res) => {
  try {
    const { nombre, es_ninio, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El campo nombre es requerido.' });
    const talla = await tallaModel.updateTalla(req.params.id, nombre, es_ninio ?? false, descripcion ?? null);
    if (!talla) return res.status(404).json({ error: 'Talla no encontrada.' });
    res.json({ mensaje: 'Talla actualizada.', talla });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar la talla.' });
  }
};

// DELETE /api/tallas/:id
const deleteTalla = async (req, res) => {
  try {
    const talla = await tallaModel.deleteTalla(req.params.id);
    if (!talla) return res.status(404).json({ error: 'Talla no encontrada.' });
    res.json({ mensaje: 'Talla eliminada.', talla });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la talla.' });
  }
};

// PATCH /api/tallas/:id/orden  — intercambia orden con otra talla
const swapOrdenTallas = async (req, res) => {
  try {
    const { swap_with } = req.body;
    if (!swap_with) return res.status(400).json({ error: 'Se requiere swap_with.' });
    const ok = await tallaModel.swapOrdenTallas(req.params.id, swap_with);
    if (!ok) return res.status(404).json({ error: 'Talla(s) no encontrada(s).' });
    res.json({ mensaje: 'Orden actualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al reordenar tallas.' });
  }
};

module.exports = {
  getCatalogo,
  getProductoDetalle,
  getAllProductos,
  getProductoAdminById,
  createProducto,
  updateProducto,
  updateStockTalla,
  desactivarProducto,
  addImagen,
  deleteImagen,
  getTallas,
  createTalla,
  updateTalla,
  deleteTalla,
  swapOrdenTallas,
};