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
        ? p.tallas.map(t => ({ id_talla: t.id_talla, talla: t.nombre, disponible: true }))
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
  async createProducto({ nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas }) {
    return await this._req('/admin/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas })
    });
  },

  // ─── Admin: editar producto (UC-05) ──────────────────────────
  async updateProducto(id, { nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas }) {
    return await this._req(`/admin/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion, precio_base, disponible, activo, fecha_publicacion, ids_tallas })
    });
  },

  // ─── Admin: desactivar producto — UC-05 flujo alt. 10b ───────
  async desactivarProducto(id) {
    return await this._req(`/admin/productos/${id}/desactivar`, { method: 'PATCH' });
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
  }
};
