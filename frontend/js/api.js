// ===== API SERVICE =====
const API_URL = 'http://localhost:3000/api';

const Api = {
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
    return data; // { usuario }
  },

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
   * Avanza el estado de un pedido de 'pendiente' a 'esperando_pago'.
   * Se llama desde pago.js cuando el cliente registra su intención de pago.
   * No envía body — el backend identifica al usuario por el token JWT.
   * Solo disponible para el rol CLIENTE.
   *
   * @param {number} idPedido - ID del pedido en la BD (id_pedido, no el local)
   * @returns {Object} El pedido con estado 'esperando_pago'
   */
  /**
   * Agrega o edita el comentario interno del vendedor en un pedido.
   * No modifica el estado del pedido — solo actualiza comentarios_vendedor.
   * Solo disponible para roles VENDEDOR y ADMIN.
   *
   * @param {number} idPedido   - ID del pedido a comentar
   * @param {string} comentario - Texto de la nota interna (máximo 100 caracteres)
   * @returns {Object} El pedido con el comentario actualizado
   */
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

  async iniciarPagoPedido(idPedido) {
    const token = AppState.getToken();
    const res = await fetch(`${API_URL}/pedidos/${idPedido}/pagar`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error al registrar el pago del pedido' };
    return data;
  }
};
