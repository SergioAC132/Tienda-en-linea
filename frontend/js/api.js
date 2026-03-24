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
  }
};
