const jwt = require('jsonwebtoken');

/* Usar en cualquier ruta que requiera que el usuario esté autenticado.
El token debe venir en el header: Authorization: Bearer <token>*/
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // { id_usuario, email, rol }
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};

/* Usar después de verificarToken para restringir por rol.
Ejemplo: router.get('/admin', verificarToken, verificarRol('ADMIN'), controller)
Puede recibir uno o varios roles: verificarRol('ADMIN', 'VENDEDOR')*/
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        message: 'No tienes permisos para realizar esta acción.',
      });
    }
    next();
  };
};

module.exports = {
  verificarToken,
  verificarRol,
};