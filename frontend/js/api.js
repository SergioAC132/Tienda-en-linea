// ===== API SERVICE =====
const API_URL = 'http://localhost:3000/api';

const Api = {

  // ─── Helper privado ──────────────────────────────────────────
  async _req(path, options = {}) {
    const token = AppState.getToken();
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.error || data.message || 'Error en la solicitud' };
    return data;
  },

  // Garantiza que una URL de imagen sea absoluta (con / inicial)
  _normImgUrl(url) {
    if (!url) return url;
    if (url.startsWith('http') || url.startsWith('/')) return url;
    return `/${url}`;
  },

  // Normaliza un producto de la API al shape que usa el frontend
  _normProducto(p) {
    return {
      id:               String(p.id_producto),
      nombre:           p.nombre,
      descripcion:      p.descripcion   || '',
      precio_base:      Number(p.precio_base),
      disponible:       p.disponible    ?? true,
      activo:           p.activo        ?? true,
      fecha_publicacion: p.fecha_publicacion,
      imagenes: p.imagenes
        ? p.imagenes.map(i => ({ id_imagen: i.id_imagen, url: this._normImgUrl(i.url_imagen), orden: i.orden }))
        : p.imagen_principal
          ? [{ url: this._normImgUrl(p.imagen_principal), orden: 1 }]
          : [],
      tallas: p.tallas
        ? p.tallas.map(t => ({ id_talla: t.id_talla, talla: t.nombre, stock: t.stock ?? 0, disponible: (t.stock ?? 0) > 0 }))
        : []
    };
  },

  // ─── Auth ────────────────────────────────────────────────────
  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al iniciar sesión' };
    return data; // { token, usuario }
  },

  async register(nombre, email, password, confirmPassword, telefono) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, confirmPassword, telefono })
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al registrarse' };
    return data;
  },

  // ─── Direcciones ─────────────────────────────────────────────
  async getDirecciones() {
    const token = AppState.getToken();
    const res = await fetch(`${API_URL}/direcciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al obtener direcciones' };
    return data;
  },

  async crearDireccion(direccionData) {
    const token = AppState.getToken();
    const res = await fetch(`${API_URL}/direcciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(direccionData)
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.errores ? data.errores.join(' ') : (data.message || 'Error al crear dirección') };
    return data;
  },

  async forgotPassword(email) {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al enviar correo' };
    return data; // { message }
  },

  async resetPassword(token, password, confirmPassword) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, confirmPassword })
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al restablecer contraseña' };
    return data; // { message }
  },

  async modificarDireccion(idDireccion, direccionData) {
    const token = AppState.getToken();
    const res = await fetch(`${API_URL}/direcciones/${idDireccion}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(direccionData)
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.errores ? data.errores.join(' ') : (data.message || 'Error al actualizar dirección') };
    return data;
  },

  // ─── Pedidos ─────────────────────────────────────────────

  /**
   * GET /api/pedidos/top-productos
   * Devuelve los 5 productos con mayor cantidad total vendida.
   * Solo accesible para VENDEDOR y ADMIN.
   *
   * @returns {Array} Lista de { id_producto, nombre, imagen_url, total_vendido }
   */
  async getTopProductos() {
    return await this._req('/pedidos/top-productos');
  },


  /**
   * Obtiene pedidos según el rol del usuario autenticado.
   * - CLIENTE   → devuelve solo sus propios pedidos
   * - VENDEDOR / ADMIN → devuelve todos los pedidos del sistema
   * El backend decide el filtro basándose en el token JWT.
   *
   * @returns {Array} Lista de pedidos
   */
  async getPedidos() {
    const token = AppState.getToken();
    const res = await fetch(`${API_URL}/pedidos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al obtener los pedidos' };
    return data;
  },

  /**
   * Obtiene el detalle de un pedido específico por su ID.
   * Solo el cliente dueño del pedido puede consultarlo.
   *
   * @param {number} idPedido - ID del pedido a consultar
   * @returns {Object} El pedido encontrado
   */
  async getPedidoById(idPedido) {
    const token = AppState.getToken();
    const res = await fetch(`${API_URL}/pedidos/${idPedido}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al obtener el pedido' };
    return data;
  },

  /**
   * Crea un nuevo pedido en la base de datos.
   * Solo disponible para el rol CLIENTE.
   *
   * @param {Object} pedidoData          - Datos del pedido
   * @param {number} pedidoData.total    - Total del pedido calculado desde el carrito
   * @param {string} pedidoData.comentarios - (opcional) Comentarios del cliente
   * @returns {Object} El pedido recién creado
   */
  async crearPedido(pedidoData) {
    const token = AppState.getToken();
    const res = await fetch(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(pedidoData)
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.errores ? data.errores.join(' ') : (data.message || 'Error al crear el pedido') };
    return data;
  },

  /**
   * Actualiza el estado de un pedido existente.
   * Solo disponible para roles VENDEDOR y ADMIN.
   *
   * @param {number} idPedido                        - ID del pedido a actualizar
   * @param {Object} estadoData                      - Datos a actualizar
   * @param {string} estadoData.estado               - Nuevo estado del pedido
   * @param {string} estadoData.comentarios_vendedor - (opcional) Comentario del vendedor
   * @returns {Object} El pedido con el estado actualizado
   */
  async actualizarEstadoPedido(idPedido, estadoData) {
    const token = AppState.getToken(); //PREGUNTAR
    const res = await fetch(`${API_URL}/pedidos/${idPedido}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(estadoData)
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.errores ? data.errores.join(' ') : (data.message || 'Error al actualizar el estado del pedido') };
    return data;
  },

  /**
   * Cancela un pedido propio del cliente.
   * Solo funciona si el pedido está en estado 'pendiente'.
   * Solo disponible para el rol CLIENTE.
   *
   * @param {number} idPedido - ID del pedido a cancelar
   * @returns {Object} El pedido con estado 'cancelado'
   */
  async cancelarPedido(idPedido) {
    const token = AppState.getToken();
    const res = await fetch(`${API_URL}/pedidos/${idPedido}/cancelar`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al cancelar el pedido' };
    return data;
  },

  /**
   * Agrega o edita el comentario interno del vendedor en un pedido.
   * No modifica el estado del pedido — solo actualiza comentarios_vendedor.
   * Solo disponible para roles VENDEDOR y ADMIN.
   *
   * @param {number} idPedido   - ID del pedido a comentar
   * @param {string} comentario - Texto de la nota interna (máximo 100 caracteres)
   * @returns {Object} El pedido con el comentario actualizado
   */
  async programarEntrega(idPedido, fechaHoraEntrega) {
    return await this._req(`/pedidos/${idPedido}/programar-entrega`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha_hora_entrega: fechaHoraEntrega }),
    });
  },

  async actualizarComentarioPedido(idPedido, comentario) {
    const token = AppState.getToken();
    const res = await fetch(`${API_URL}/pedidos/${idPedido}/comentario`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ comentario })
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.errores ? data.errores.join(' ') : (data.message || 'Error al guardar el comentario') };
    return data;
  },

  // ─── Pagos ───────────────────────────────────────────────────

  async getMetodosPago() {
    return await this._req('/pagos/metodos');
  },

  async registrarPago(idPedido, idMetodoPago) {
    return await this._req('/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_pedido: idPedido, id_metodo_pago: idMetodoPago }),
    });
  },

  async getPagoByPedido(idPedido) {
    return await this._req(`/pagos/pedido/${idPedido}`);
  },

  async confirmarPago(idPago) {
    return await this._req(`/pagos/${idPago}/confirmar`, { method: 'PATCH' });
  },

  async rechazarPago(idPago) {
    return await this._req(`/pagos/${idPago}/rechazar`, { method: 'PATCH' });
  },

  async subirComprobante(idPago, file) {
    const token = AppState.getToken();
    const formData = new FormData();
    formData.append('comprobante', file);
    const res = await fetch(`${API_URL}/pagos/${idPago}/comprobante`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al subir el comprobante' };
    return data;
  },

  // ─── Carrito ─────────────────────────────────────────────────

  /** GET /api/carrito — devuelve { id_carrito, items: [...] } */
  async getCarrito() {
    return await this._req('/carrito');
  },

  /**
   * POST /api/carrito/items
   * Agrega un item o suma su cantidad si ya existe.
   * @param {number} idProducto
   * @param {number} idTalla
   * @param {number} cantidad
   */
  async agregarItemCarrito(idProducto, idTalla, cantidad) {
    return await this._req('/carrito/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_producto: idProducto, id_talla: idTalla, cantidad }),
    });
  },

  /**
   * PUT /api/carrito/items/:id_producto/:id_talla
   * Establece la cantidad exacta. Si cantidad = 0 elimina el item.
   * @param {number} idProducto
   * @param {number} idTalla
   * @param {number} cantidad
   */
  async actualizarItemCarrito(idProducto, idTalla, cantidad) {
    return await this._req(`/carrito/items/${idProducto}/${idTalla}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad }),
    });
  },

  /**
   * DELETE /api/carrito/items/:id_producto/:id_talla
   * Elimina un item específico del carrito.
   */
  async eliminarItemCarrito(idProducto, idTalla) {
    return await this._req(`/carrito/items/${idProducto}/${idTalla}`, { method: 'DELETE' });
  },

  /** DELETE /api/carrito — vacía todo el carrito */
  async vaciarCarrito() {
    return await this._req('/carrito', { method: 'DELETE' });
  },

  // ─── Catálogo público (UC-03) ────────────────────────────────
  async getCatalogo() {
    const data = await this._req('/productos');
    return (Array.isArray(data) ? data : data.productos || []).map(p => this._normProducto(p));
  },

  // ─── Detalle de producto público (UC-04) ─────────────────────
  async getProductoDetalle(id) {
    const p = await this._req(`/productos/${id}`);
    return this._normProducto(p);
  },

  // ─── Admin: lista todos los productos ────────────────────────
  async getAllProductosAdmin() {
    const data = await this._req('/admin/productos');
    return (Array.isArray(data) ? data : []).map(p => this._normProducto(p));
  },

  // ─── Admin: detalle completo de un producto ───────────────────
  async getProductoAdminById(id) {
    const p = await this._req(`/admin/productos/${id}`);
    return this._normProducto(p);
  },

  // ─── Admin: crear producto (UC-05) ───────────────────────────
  async createProducto({ nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas, tallas_stock }) {
    return await this._req('/admin/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas, tallas_stock })
    });
  },

  // ─── Admin: editar producto (UC-05) ──────────────────────────
  async updateProducto(id, { nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas, tallas_stock }) {
    return await this._req(`/admin/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas, tallas_stock })
    });
  },

  // ─── Admin: desactivar producto — UC-05 flujo alt. 10b ───────
  async desactivarProducto(id) {
    return await this._req(`/admin/productos/${id}/desactivar`, { method: 'PATCH' });
  },

  // ─── Admin: actualizar stock de una talla ────────────────────
  async updateStockTalla(productoId, idTalla, stock) {
    return await this._req(`/admin/productos/${productoId}/tallas/${idTalla}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock })
    });
  },

  // ─── Imágenes ─────────────────────────────────────────────────
  async addImagenProducto(productoId, fileOrUrl, orden) {
    const token = AppState.getToken();
    const baseHeaders = { 'Authorization': `Bearer ${token}` };
    let body, headers;

    if (fileOrUrl instanceof File) {
      body = new FormData();
      body.append('imagen', fileOrUrl);
      body.append('orden', orden);
      headers = { ...baseHeaders }; // browser sets Content-Type with boundary
    } else {
      headers = { ...baseHeaders, 'Content-Type': 'application/json' };
      body = JSON.stringify({ ruta_imagen: fileOrUrl, orden });
    }

    const res = await fetch(`${API_URL}/admin/productos/${productoId}/imagenes`, {
      method: 'POST', headers, body
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.error || 'Error al subir imagen' };
    return data;
  },

  async deleteImagenProducto(productoId, idImagen) {
    return await this._req(`/admin/productos/${productoId}/imagenes/${idImagen}`, { method: 'DELETE' });
  },

  // ─── Tallas ───────────────────────────────────────────────────
  async getTallas() {
    const data = await this._req('/tallas');
    return Array.isArray(data) ? data : [];
  },

  async createTalla(nombre, es_ninio = false, descripcion = null) {
    return await this._req('/tallas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, es_ninio, descripcion })
    });
  },

  async updateTalla(id, nombre, es_ninio = false, descripcion = null) {
    return await this._req(`/tallas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, es_ninio, descripcion })
    });
  },

  async deleteTalla(id) {
    return await this._req(`/tallas/${id}`, { method: 'DELETE' });
  },

  async swapTallaOrden(id1, id2) {
    return await this._req(`/tallas/${id1}/orden`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ swap_with: id2 })
    });
  },

  // ─── Admin: gestión de usuarios ──────────────────────────────

  /* GET /api/admin/usuarios — devuelve todos los usuarios normalizados */
  async getUsuarios() {
    const data = await this._req('/admin/usuarios');
    return data.map(u => ({
      id:             String(u.id_usuario),
      nombre:         u.nombre,
      correo:         u.email,
      rol:            u.rol,
      estado:         u.activo ? 'activo' : 'inactivo',
      fecha_creacion: u.fecha_creacion,
    }));
  },

  /* PATCH /api/admin/usuarios/:id/estado — activa o desactiva un usuario */
  async toggleEstadoUsuario(id) {
    const data = await this._req(`/admin/usuarios/${id}/estado`, { method: 'PATCH' });
    return {
      id:     String(data.id_usuario),
      estado: data.activo ? 'activo' : 'inactivo',
    };
  },

  /* POST /api/admin/usuarios — crea usuario con rol VENDEDOR o ADMIN */
  async crearUsuario({ nombre, email, password, rol, confirmar_admin }) {
    const data = await this._req('/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, rol, confirmar_admin }),
    });
    return {
      id:             String(data.id_usuario),
      nombre:         data.nombre,
      correo:         data.email,
      rol:            data.rol,
      estado:         data.activo ? 'activo' : 'inactivo',
      fecha_creacion: data.fecha_creacion,
    };
  },

  // ─── Puntos de entrega ───────────────────────────────────────

  /* GET /api/admin/puntos-entrega — activos para CLIENTE, todos para ADMIN */
  async getPuntosEntrega() {
    return await this._req('/admin/puntos-entrega');
  },

  /* POST /api/admin/puntos-entrega — crea un punto de entrega */
  async crearPuntoEntrega({ nombre, descripcion }) {
    return await this._req('/admin/puntos-entrega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion }),
    });
  },

  /* PATCH /api/admin/puntos-entrega/:id/estado — activa/desactiva */
  async toggleActivoPunto(id) {
    return await this._req(`/admin/puntos-entrega/${id}/estado`, { method: 'PATCH' });
  },
}
