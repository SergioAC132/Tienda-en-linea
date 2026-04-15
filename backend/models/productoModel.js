// models/productoModel.js   JACK BRANDON ESPINOSA NUÑEZ 2024-06-12
const pool = require('../config/db');

// PRODUCTOS

// Listar productos del catálogo público (activo=true Y disponible=true) — UC-03
const getProductosCatalogo = async () => {
  const { rows } = await pool.query(`
    SELECT
      p.id_producto,
      p.nombre,
      p.precio_base,
      p.fecha_publicacion,
      img.url_imagen AS imagen_principal
    FROM productos p
    LEFT JOIN imagen_producto img
      ON img.id_producto = p.id_producto AND img.orden = 1
    WHERE p.activo = true AND p.disponible = true
    ORDER BY p.fecha_publicacion DESC
  `);
  return rows;
};

// Listar TODOS los productos para panel admin/vendedor (activos e inactivos) — UC-05
const getAllProductos = async () => {
  const { rows } = await pool.query(`
    SELECT
      p.id_producto,
      p.nombre,
      p.precio_base,
      p.disponible,
      p.activo,
      p.fecha_publicacion,
      img.url_imagen AS imagen_principal
    FROM productos p
    LEFT JOIN imagen_producto img
      ON img.id_producto = p.id_producto AND img.orden = 1
    ORDER BY p.fecha_publicacion DESC
  `);
  return rows;
};

// Detalle completo de un producto: imágenes + tallas — UC-04
const getProductoById = async (id) => {
  // Producto base
  const { rows: productoRows } = await pool.query(
    'SELECT * FROM productos WHERE id_producto = $1 AND activo = true',
    [id]
  );
  if (!productoRows[0]) return null;

  // Imágenes ordenadas
  const { rows: imagenes } = await pool.query(
    'SELECT id_imagen, url_imagen, orden FROM imagen_producto WHERE id_producto = $1 ORDER BY orden ASC',
    [id]
  );

  // Tallas asociadas
  const { rows: tallas } = await pool.query(`
    SELECT t.id_talla, t.nombre, pt.stock
    FROM tallas t
    INNER JOIN productos_tallas pt ON pt.id_talla = t.id_talla
    WHERE pt.id_producto = $1
    ORDER BY t.nombre ASC
  `, [id]);

  return { ...productoRows[0], imagenes, tallas };
};

// Crear producto — UC-05
const createProducto = async ({ nombre, descripcion, precio_base, disponible, activo, fecha_publicacion }) => {
  // Verificar nombre duplicado
  const { rows: existe } = await pool.query(
    'SELECT id_producto FROM productos WHERE nombre = $1',
    [nombre]
  );
  if (existe[0]) return { error: 'Ya existe un producto con ese nombre.' };

  const { rows } = await pool.query(
    `INSERT INTO productos (nombre, descripcion, precio_base, disponible, activo, fecha_publicacion)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [nombre, descripcion, precio_base, disponible ?? true, activo ?? true, fecha_publicacion ?? new Date()]
  );
  return { producto: rows[0] };
};

// Actualizar producto — UC-05
const updateProducto = async (id, { nombre, descripcion, precio_base, disponible, activo, fecha_publicacion }) => {
  // Verificar nombre duplicado en otro producto
  if (nombre) {
    const { rows: existe } = await pool.query(
      'SELECT id_producto FROM productos WHERE nombre = $1 AND id_producto != $2',
      [nombre, id]
    );
    if (existe[0]) return { error: 'Ya existe un producto con ese nombre.' };
  }

  const { rows } = await pool.query(
    `UPDATE productos
     SET nombre            = COALESCE($1, nombre),
         descripcion       = COALESCE($2, descripcion),
         precio_base       = COALESCE($3, precio_base),
         disponible        = COALESCE($4, disponible),
         activo            = COALESCE($5, activo),
         fecha_publicacion = COALESCE($6, fecha_publicacion)
     WHERE id_producto = $7
     RETURNING *`,
    [nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, id]
  );
  return { producto: rows[0] };
};

// Eliminar (soft delete: desactivar) producto — UC-05 flujo alt. 10b
const desactivarProducto = async (id) => {
  const { rows } = await pool.query(
    'UPDATE productos SET activo = false WHERE id_producto = $1 RETURNING *',
    [id]
  );
  return rows[0];
};

// IMAGENES DEL PRODUCTO

// Agregar imagen a un producto
const addImagen = async (id_producto, url_imagen, orden) => {
  const { rows } = await pool.query(
    'INSERT INTO imagen_producto (id_producto, url_imagen, orden) VALUES ($1, $2, $3) RETURNING *',
    [id_producto, url_imagen, orden]
  );
  return rows[0];
};

// Eliminar imagen y reordenar las restantes — UC-05 flujo alt. 10a
const deleteImagen = async (id_imagen, id_producto) => {
  await pool.query('DELETE FROM imagen_producto WHERE id_imagen = $1', [id_imagen]);

  // Reordenar las imágenes restantes del producto
  await pool.query(`
    UPDATE imagen_producto
    SET orden = sub.nuevo_orden
    FROM (
      SELECT id_imagen, ROW_NUMBER() OVER (ORDER BY orden) AS nuevo_orden
      FROM imagen_producto
      WHERE id_producto = $1
    ) sub
    WHERE imagen_producto.id_imagen = sub.id_imagen
  `, [id_producto]);
};

// TALLAS DEL PRODUCTO 

// Asignar tallas a un producto (reemplaza las existentes)
const setTallasProducto = async (id_producto, ids_tallas) => {
  // Eliminar relaciones anteriores
  await pool.query('DELETE FROM productos_tallas WHERE id_producto = $1', [id_producto]);

  if (!ids_tallas || ids_tallas.length === 0) return [];

  // Insertar las nuevas
  const values = ids_tallas.map((_, i) => `($1, $${i + 2})`).join(', ');
  const { rows } = await pool.query(
    `INSERT INTO productos_tallas (id_producto, id_talla) VALUES ${values} RETURNING *`,
    [id_producto, ...ids_tallas]
  );
  return rows;
};

// Detalle completo de un producto para el panel admin/vendedor (sin filtro activo)
const getProductoAdminById = async (id) => {
  const { rows: productoRows } = await pool.query(
    'SELECT * FROM productos WHERE id_producto = $1',
    [id]
  );
  if (!productoRows[0]) return null;

  const { rows: imagenes } = await pool.query(
    'SELECT id_imagen, url_imagen, orden FROM imagen_producto WHERE id_producto = $1 ORDER BY orden ASC',
    [id]
  );

  const { rows: tallas } = await pool.query(`
    SELECT t.id_talla, t.nombre
    FROM tallas t
    INNER JOIN productos_tallas pt ON pt.id_talla = t.id_talla
    WHERE pt.id_producto = $1
    ORDER BY t.nombre ASC
  `, [id]);

  return { ...productoRows[0], imagenes, tallas };
};

module.exports = {
  getProductosCatalogo,
  getAllProductos,
  getProductoById,
  getProductoAdminById,
  createProducto,
  updateProducto,
  desactivarProducto,
  addImagen,
  deleteImagen,
  setTallasProducto,
};