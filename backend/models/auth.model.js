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
 
module.exports = {
  findUserByEmail,
  createUser,
};