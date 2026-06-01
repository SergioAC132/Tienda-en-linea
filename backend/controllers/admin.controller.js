const bcrypt     = require('bcryptjs');
const adminModel = require('../models/admin.model');

/* GET /api/admin/usuarios
   Solo accesible para ADMIN.
   Devuelve la lista completa de usuarios sin datos sensibles. */
const getUsuarios = async (req, res) => {
  try {
    const usuarios = await adminModel.getAllUsuarios();
    return res.status(200).json(usuarios);
  } catch (error) {
    console.error('Error en getUsuarios:', error.message);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/* PATCH /api/admin/usuarios/:id/estado
   Solo accesible para ADMIN.
   Invierte el estado activo del usuario indicado.
   Previene que el admin desactive su propia cuenta. */
const toggleEstado = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID de usuario inválido.' });
  }

  if (req.usuario.id_usuario === id) {
    return res.status(403).json({ message: 'No puedes modificar el estado de tu propia cuenta.' });
  }

  try {
    const usuario = await adminModel.toggleEstadoUsuario(id);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    return res.status(200).json(usuario);
  } catch (error) {
    console.error('Error en toggleEstado:', error.message);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/* POST /api/admin/usuarios
   Crea un usuario con rol VENDEDOR o ADMIN.
   Para ADMIN requiere confirmar_admin: true en el body. */
const crearUsuario = async (req, res) => {
  const { nombre, email, password, rol, confirmar_admin } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  if (!['ADMIN', 'VENDEDOR'].includes(rol)) {
    return res.status(400).json({ message: 'Rol inválido. Solo se permite ADMIN o VENDEDOR.' });
  }

  if (rol === 'ADMIN' && !confirmar_admin) {
    return res.status(400).json({ message: 'La creación de un administrador requiere confirmación explícita.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await adminModel.crearUsuario(nombre, email, passwordHash, rol);
    return res.status(201).json(usuario);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un usuario con ese correo electrónico.' });
    }
    console.error('Error en crearUsuario:', error.message);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/* GET /api/admin/puntos-entrega
   Clientes ven solo activos; admin ve todos. */
const getPuntosEntrega = async (req, res) => {
  try {
    const soloActivos = req.usuario.rol === 'CLIENTE';
    const puntos = await adminModel.getAllPuntosEntrega(soloActivos);
    return res.status(200).json(puntos);
  } catch (error) {
    console.error('Error en getPuntosEntrega:', error.message);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/* POST /api/admin/puntos-entrega
   Solo ADMIN puede crear puntos de entrega. */
const crearPuntoEntrega = async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ message: 'El nombre es requerido.' });
  }
  try {
    const punto = await adminModel.createPuntoEntrega(nombre.trim(), descripcion?.trim() || null);
    return res.status(201).json(punto);
  } catch (error) {
    console.error('Error en crearPuntoEntrega:', error.message);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/* PATCH /api/admin/puntos-entrega/:id/estado
   Activa o desactiva un punto de entrega. */
const toggleActivoPunto = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID de punto de entrega inválido.' });
  }
  try {
    const punto = await adminModel.toggleActivoPuntoEntrega(id);
    if (!punto) {
      return res.status(404).json({ message: 'Punto de entrega no encontrado.' });
    }
    return res.status(200).json(punto);
  } catch (error) {
    console.error('Error en toggleActivoPunto:', error.message);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = {
  getUsuarios,
  toggleEstado,
  crearUsuario,
  getPuntosEntrega,
  crearPuntoEntrega,
  toggleActivoPunto,
};
