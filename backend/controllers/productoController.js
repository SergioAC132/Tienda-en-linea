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
    const { nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas } = req.body;

    // Campos requeridos
    if (!nombre || !precio_base) {
      return res.status(400).json({ error: 'Los campos nombre y precio_base son requeridos.' });
    }

    const result = await productoModel.createProducto({ nombre, descripcion, precio_base, disponible, activo, fecha_publicacion });
    if (result.error) return res.status(409).json({ error: result.error });

    const producto = result.producto;

    // Asignar tallas si vienen en el body
    if (ids_tallas && ids_tallas.length > 0) {
      await productoModel.setTallasProducto(producto.id_producto, ids_tallas);
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
    const { nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas } = req.body;

    const result = await productoModel.updateProducto(req.params.id, { nombre, descripcion, precio_base, disponible, activo, fecha_publicacion });
    if (!result.producto) return res.status(404).json({ error: 'Producto no encontrado.' });
    if (result.error)    return res.status(409).json({ error: result.error });

    // Actualizar tallas si vienen
    if (ids_tallas !== undefined) {
      await productoModel.setTallasProducto(req.params.id, ids_tallas);
    }

    res.json({ mensaje: 'Producto actualizado correctamente.', producto: result.producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el producto.' });
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

// POST /api/admin/productos/:id/imagenes
// Espera que el middleware de multa ya haya procesado el archivo
const addImagen = async (req, res) => {
  try {
    const { orden } = req.body;
    const ruta_imagen = req.file?.path || req.body.ruta_imagen; // ajusta según tu multer config

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
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El campo nombre es requerido.' });
    const talla = await tallaModel.createTalla(nombre);
    res.status(201).json({ mensaje: 'Talla creada.', talla });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la talla.' });
  }
};

// PUT /api/tallas/:id
const updateTalla = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El campo nombre es requerido.' });
    const talla = await tallaModel.updateTalla(req.params.id, nombre);
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

module.exports = {
  getCatalogo,
  getProductoDetalle,
  getAllProductos,
  createProducto,
  updateProducto,
  desactivarProducto,
  addImagen,
  deleteImagen,
  getTallas,
  createTalla,
  updateTalla,
  deleteTalla,
};