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

module.exports = {
  getUsuarios,
  toggleEstado,
};
