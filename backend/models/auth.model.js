const pool = require('../config/db');
 
/* Busca un usuario por su email y retorna el registro completo (incluyendo 
password hash) para validación.*/
const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE email = $1',
    [email]
  );
  return rows[0] || null;
};
 
/* Crea un nuevo usuario con rol CLIENTE. La password ya debe llegar
encriptada desde el controller.*/
const createUser = async ({ nombre, email, password, telefono }) => {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, telefono, rol, activo, fecha_creacion)
     VALUES ($1, $2, $3, $4, 'CLIENTE', TRUE, NOW())
     RETURNING id_usuario, nombre, email, telefono, rol, activo, fecha_creacion`,
    [nombre, email, password, telefono]
  );
  return rows[0];
};
 
/* Guarda un token de recuperación y su fecha de expiración para el usuario. */
const saveResetToken = async (id_usuario, token, expiry) => {
  await pool.query(
    'UPDATE usuarios SET reset_token = $1, reset_token_expiry = $2 WHERE id_usuario = $3',
    [token, expiry, id_usuario]
  );
};

/* Busca un usuario por su token de recuperación.
   Incluye password para validar que la nueva sea distinta. */
const findUserByResetToken = async (token) => {
  const { rows } = await pool.query(
    'SELECT id_usuario, email, password, reset_token_expiry FROM usuarios WHERE reset_token = $1',
    [token]
  );
  return rows[0] || null;
};

/* Elimina el token de recuperación tras usarlo. */
const clearResetToken = async (id_usuario) => {
  await pool.query(
    'UPDATE usuarios SET reset_token = NULL, reset_token_expiry = NULL WHERE id_usuario = $1',
    [id_usuario]
  );
};

/* Actualiza el hash de contraseña del usuario. */
const updatePassword = async (id_usuario, passwordHash) => {
  await pool.query(
    'UPDATE usuarios SET password = $1 WHERE id_usuario = $2',
    [passwordHash, id_usuario]
  );
};

module.exports = {
  findUserByEmail,
  createUser,
  saveResetToken,
  findUserByResetToken,
  clearResetToken,
  updatePassword,
};