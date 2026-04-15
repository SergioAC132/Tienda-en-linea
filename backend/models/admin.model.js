const pool = require('../config/db');

/* Devuelve todos los usuarios del sistema (sin contraseña). */
const getAllUsuarios = async () => {
  const { rows } = await pool.query(
    `SELECT id_usuario, nombre, email, rol, activo, fecha_creacion
     FROM usuarios
     ORDER BY fecha_creacion DESC`
  );
  return rows;
};

/* Invierte el estado activo de un usuario y retorna el registro actualizado. */
const toggleEstadoUsuario = async (id_usuario) => {
  const { rows } = await pool.query(
    `UPDATE usuarios
     SET activo = NOT activo
     WHERE id_usuario = $1
     RETURNING id_usuario, nombre, email, rol, activo, fecha_creacion`,
    [id_usuario]
  );
  return rows[0] || null;
};

module.exports = {
  getAllUsuarios,
  toggleEstadoUsuario,
};
