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

/* Inserta un nuevo usuario con el rol especificado (ADMIN o VENDEDOR). */
const crearUsuario = async (nombre, email, passwordHash, rol) => {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING id_usuario, nombre, email, rol, activo, fecha_creacion`,
    [nombre, email, passwordHash, rol]
  );
  return rows[0];
};

const getAllPuntosEntrega = async (soloActivos = false) => {
  const where = soloActivos ? 'WHERE activo = true' : '';
  const { rows } = await pool.query(
    `SELECT id_punto_entrega, nombre, descripcion, activo, fecha_creacion
     FROM puntos_entrega ${where}
     ORDER BY nombre ASC`
  );
  return rows;
};

const createPuntoEntrega = async (nombre, descripcion) => {
  const { rows } = await pool.query(
    `INSERT INTO puntos_entrega (nombre, descripcion)
     VALUES ($1, $2)
     RETURNING id_punto_entrega, nombre, descripcion, activo, fecha_creacion`,
    [nombre, descripcion || null]
  );
  return rows[0];
};

const toggleActivoPuntoEntrega = async (id) => {
  const { rows } = await pool.query(
    `UPDATE puntos_entrega
     SET activo = NOT activo
     WHERE id_punto_entrega = $1
     RETURNING id_punto_entrega, nombre, descripcion, activo, fecha_creacion`,
    [id]
  );
  return rows[0] || null;
};

module.exports = {
  getAllUsuarios,
  toggleEstadoUsuario,
  crearUsuario,
  getAllPuntosEntrega,
  createPuntoEntrega,
  toggleActivoPuntoEntrega,
};
