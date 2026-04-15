// controllers/carrito.controller.js
const {
  getCarritoConItems,
  upsertItem,
  updateCantidadItem,
  removeItem,
  clearCarrito,
} = require('../models/carrito.model');

// ─────────────────────────────────────────────────────────────
//  CONTROLLER DE CARRITO
//  Todas las rutas son exclusivas del rol CLIENTE.
//  El id_usuario se extrae del token JWT (req.usuario.id_usuario).
// ─────────────────────────────────────────────────────────────


/**
 * GET /api/carrito
 * Devuelve el carrito del cliente con todos sus items enriquecidos.
 * Si el usuario nunca tuvo carrito se crea uno vacío en ese momento.
 */
const getCarrito = async (req, res) => {
  try {
    const carrito = await getCarritoConItems(req.usuario.id_usuario);
    res.json(carrito);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el carrito.', error: error.message });
  }
};


/**
 * POST /api/carrito/items
 * Agrega un item al carrito o suma su cantidad si ya existe.
 *
 * Body:
 *   id_producto {number}  ID del producto
 *   id_talla    {number}  ID de la talla
 *   cantidad    {number}  Unidades a agregar (>= 1)
 *
 * Responde con el carrito actualizado o 400 si la validación falla.
 */
const agregarItem = async (req, res) => {
  try {
    const { id_producto, id_talla, cantidad } = req.body;

    if (!id_producto || !id_talla || !cantidad || cantidad < 1) {
      return res.status(400).json({
        message: 'id_producto, id_talla y cantidad (mínimo 1) son requeridos.',
      });
    }

    const result = await upsertItem(
      req.usuario.id_usuario,
      id_producto,
      id_talla,
      cantidad
    );

    if (result.error) return res.status(400).json({ message: result.error });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar el item.', error: error.message });
  }
};


/**
 * PUT /api/carrito/items/:id_producto/:id_talla
 * Establece la cantidad exacta de un item.
 * Si se envía cantidad = 0 el item se elimina.
 *
 * Body:
 *   cantidad {number}  Nueva cantidad (0 para eliminar)
 */
const actualizarItem = async (req, res) => {
  try {
    const { id_producto, id_talla } = req.params;
    const { cantidad } = req.body;

    if (cantidad === undefined || cantidad === null || cantidad < 0) {
      return res.status(400).json({ message: 'cantidad debe ser un número >= 0.' });
    }

    const result = await updateCantidadItem(
      req.usuario.id_usuario,
      id_producto,
      id_talla,
      cantidad
    );

    if (result?.error) return res.status(400).json({ message: result.error });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el item.', error: error.message });
  }
};


/**
 * DELETE /api/carrito/items/:id_producto/:id_talla
 * Elimina un item específico del carrito.
 */
const eliminarItem = async (req, res) => {
  try {
    const { id_producto, id_talla } = req.params;
    const result = await removeItem(req.usuario.id_usuario, id_producto, id_talla);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el item.', error: error.message });
  }
};


/**
 * DELETE /api/carrito
 * Vacía todos los items del carrito.
 * Se llama desde el frontend tras confirmar un pedido.
 */
const vaciarCarrito = async (req, res) => {
  try {
    await clearCarrito(req.usuario.id_usuario);
    res.json({ message: 'Carrito vaciado.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al vaciar el carrito.', error: error.message });
  }
};


module.exports = {
  getCarrito,
  agregarItem,
  actualizarItem,
  eliminarItem,
  vaciarCarrito,
};
