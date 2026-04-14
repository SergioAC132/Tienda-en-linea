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
  }
};
