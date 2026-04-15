// models/carrito.model.js
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────
//  MODELO DE CARRITO
//  Toda la lógica SQL del carrito vive aquí.
//  El carrito es 1-a-1 con el usuario: se crea en la primera
//  operación y persiste aunque quede vacío.
// ─────────────────────────────────────────────────────────────


/**
 * Obtiene el id_carrito del usuario. Si no tiene carrito lo crea.
 * Operación idempotente gracias al ON CONFLICT DO NOTHING.
 *
 * @param {number} idUsuario
 * @returns {number} id_carrito
 */
const getOrCreateCarrito = async (idUsuario) => {
  await pool.query(
    `INSERT INTO carritos (id_usuario) VALUES ($1) ON CONFLICT (id_usuario) DO NOTHING`,
    [idUsuario]
  );
  const { rows } = await pool.query(
    `SELECT id_carrito FROM carritos WHERE id_usuario = $1`,
    [idUsuario]
  );
  return rows[0].id_carrito;
};


/**
 * Devuelve el carrito del usuario con todos sus items enriquecidos
 * (nombre, precio, imagen, nombre de talla, stock disponible).
 * Si el usuario no tiene carrito lo crea vacío.
 *
 * @param {number} idUsuario
 * @returns {{ id_carrito: number, items: Array }}
 */
const getCarritoConItems = async (idUsuario) => {
  const idCarrito = await getOrCreateCarrito(idUsuario);

  const { rows } = await pool.query(
    `SELECT
       ci.id_producto,
       ci.id_talla,
       ci.cantidad,
       p.nombre,
       p.precio_base,
       t.nombre            AS talla,
       pt.stock            AS stock_disponible,
       img.url_imagen      AS imagen_url
     FROM carrito_items ci
     JOIN productos        p   ON p.id_producto = ci.id_producto
     JOIN tallas           t   ON t.id_talla    = ci.id_talla
     JOIN productos_tallas pt  ON pt.id_producto = ci.id_producto
                              AND pt.id_talla    = ci.id_talla
     LEFT JOIN imagen_producto img
                               ON img.id_producto = ci.id_producto
                              AND img.orden = 1
     WHERE ci.id_carrito = $1
     ORDER BY ci.id_producto, ci.id_talla`,
    [idCarrito]
  );

  return { id_carrito: idCarrito, items: rows };
};


/**
 * Agrega un item al carrito o incrementa su cantidad si ya existe.
 * La cantidad resultante nunca supera el stock disponible.
 *
 * @param {number} idUsuario
 * @param {number} idProducto
 * @param {number} idTalla
 * @param {number} cantidad   Unidades a agregar (>= 1)
 * @returns {{ error?: string } | { id_carrito, items }}
 */
const upsertItem = async (idUsuario, idProducto, idTalla, cantidad) => {
  const idCarrito = await getOrCreateCarrito(idUsuario);

  // Verificar que la combinación producto-talla existe y tiene stock
  const { rows: ptRows } = await pool.query(
    `SELECT stock FROM productos_tallas WHERE id_producto = $1 AND id_talla = $2`,
    [idProducto, idTalla]
  );
  if (!ptRows[0]) return { error: 'Combinación producto-talla no encontrada.' };

  const stock = ptRows[0].stock ?? 0;
  if (stock <= 0) return { error: 'Sin stock disponible para esta talla.' };

  // INSERT si no existe, suma de cantidad si ya existe — sin pasarse del stock
  await pool.query(
    `INSERT INTO carrito_items (id_carrito, id_producto, id_talla, cantidad)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id_carrito, id_producto, id_talla)
     DO UPDATE SET cantidad = LEAST(carrito_items.cantidad + EXCLUDED.cantidad, $5)`,
    [idCarrito, idProducto, idTalla, cantidad, stock]
  );

  await pool.query(
    `UPDATE carritos SET fecha_actualizacion = NOW() WHERE id_carrito = $1`,
    [idCarrito]
  );

  return getCarritoConItems(idUsuario);
};


/**
 * Establece la cantidad exacta de un item ya existente en el carrito.
 * Si cantidad <= 0 elimina el item.
 * La cantidad no puede superar el stock disponible.
 *
 * @param {number} idUsuario
 * @param {number} idProducto
 * @param {number} idTalla
 * @param {number} cantidad   Nueva cantidad (0 = eliminar)
 * @returns {{ error?: string } | { id_carrito, items }}
 */
const updateCantidadItem = async (idUsuario, idProducto, idTalla, cantidad) => {
  const idCarrito = await getOrCreateCarrito(idUsuario);

  if (cantidad <= 0) {
    await pool.query(
      `DELETE FROM carrito_items
       WHERE id_carrito = $1 AND id_producto = $2 AND id_talla = $3`,
      [idCarrito, idProducto, idTalla]
    );
  } else {
    const { rows: ptRows } = await pool.query(
      `SELECT stock FROM productos_tallas WHERE id_producto = $1 AND id_talla = $2`,
      [idProducto, idTalla]
    );
    if (!ptRows[0]) return { error: 'Combinación producto-talla no encontrada.' };

    const stock = ptRows[0].stock ?? 0;
    const cantidadFinal = Math.min(cantidad, stock);

    const { rowCount } = await pool.query(
      `UPDATE carrito_items SET cantidad = $4
       WHERE id_carrito = $1 AND id_producto = $2 AND id_talla = $3`,
      [idCarrito, idProducto, idTalla, cantidadFinal]
    );
    if (rowCount === 0) return { error: 'Item no encontrado en el carrito.' };
  }

  await pool.query(
    `UPDATE carritos SET fecha_actualizacion = NOW() WHERE id_carrito = $1`,
    [idCarrito]
  );

  return getCarritoConItems(idUsuario);
};


/**
 * Elimina un item específico del carrito.
 *
 * @param {number} idUsuario
 * @param {number} idProducto
 * @param {number} idTalla
 * @returns {{ id_carrito, items }}
 */
const removeItem = async (idUsuario, idProducto, idTalla) => {
  const idCarrito = await getOrCreateCarrito(idUsuario);

  await pool.query(
    `DELETE FROM carrito_items
     WHERE id_carrito = $1 AND id_producto = $2 AND id_talla = $3`,
    [idCarrito, idProducto, idTalla]
  );

  await pool.query(
    `UPDATE carritos SET fecha_actualizacion = NOW() WHERE id_carrito = $1`,
    [idCarrito]
  );

  return getCarritoConItems(idUsuario);
};


/**
 * Elimina todos los items del carrito del usuario.
 * Se llama tras confirmar un pedido.
 *
 * @param {number} idUsuario
 */
const clearCarrito = async (idUsuario) => {
  const idCarrito = await getOrCreateCarrito(idUsuario);

  await pool.query(
    `DELETE FROM carrito_items WHERE id_carrito = $1`,
    [idCarrito]
  );

  await pool.query(
    `UPDATE carritos SET fecha_actualizacion = NOW() WHERE id_carrito = $1`,
    [idCarrito]
  );
};


module.exports = {
  getCarritoConItems,
  upsertItem,
  updateCantidadItem,
  removeItem,
  clearCarrito,
};
