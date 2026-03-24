const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const authModel   = require('../models/auth.model');
 
/* POST /api/auth/login
   Body: { email, password }*/
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Este campo es requerido.' });
  }
 
  try {
    const usuario = await authModel.findUserByEmail(email);
 
    if (!usuario) {
      return res.status(401).json({ message: 'No existe una cuenta con ese correo.' });
    }
 
    if (!usuario.activo) {
      return res.status(403).json({
        message: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
      });
    }
 
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }
 
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email:      usuario.email,
        rol:        usuario.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
 
    return res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre:     usuario.nombre,
        email:      usuario.email,
        rol:        usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en login:', error.message);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
 
/* POST /api/auth/register
   Body: { nombre, email, password, telefono }*/
const register = async (req, res) => {
  const { nombre, email, password, confirmPassword, telefono } = req.body;
 
  if (!nombre || !email || !password || !confirmPassword || !telefono) {
    return res.status(400).json({ message: 'Este campo es requerido.' });
  }
 
  if (!/^\d{10}$/.test(telefono)) {
    return res.status(400).json({
      message: 'Ingresa un número de teléfono válido (10 dígitos).',
    });
  }
 
  if (password.length < 8) {
    return res.status(400).json({
      message: 'La contraseña debe tener al menos 8 caracteres.',
    });
  }

  if (confirmPassword != password) {
    return res.status(400).json({
      message: 'Las contraseñas no coinciden.',
    });
  }
 
  try {
    const usuarioExistente = await authModel.findUserByEmail(email);
    if (usuarioExistente) {
      return res.status(409).json({
        message: 'Ya existe una cuenta con ese correo. ¿Deseas iniciar sesión?',
      });
    }
 
    const passwordHash = await bcrypt.hash(password, 12);
 
    const nuevoUsuario = await authModel.createUser({
      nombre,
      email,
      password: passwordHash,
      telefono,
    });
 
    return res.status(201).json({
      message: 'Cuenta creada exitosamente.',
      usuario: nuevoUsuario,
    });
  } catch (error) {
    console.error('Error en registro:', error.message);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
 
module.exports = {
  login,
  register,
};