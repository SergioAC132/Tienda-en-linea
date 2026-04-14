// models/tallaModel.js  JACK BRANDON ESPINOSA NUÑEZ 2024-06-12
const pool = require('../config/db');

// Obtener todas las tallas disponibles
const getAllTallas = async () => {
  const { rows } = await pool.query('SELECT * FROM tallas ORDER BY nombre ASC');
  return rows;
};

// Obtener una talla por ID
const getTallaById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM tallas WHERE id_talla = $1', [id]);
  return rows[0];
};

// Crear una nueva talla
const createTalla = async (nombre, esNinio, descripcion) => {
  const { rows } = await pool.query(
    'INSERT INTO tallas (nombre, es_ninio, descripcion) VALUES ($1, $2, $3) RETURNING *',
    [nombre, esNinio, descripcion]
  );
  return rows[0];
};

// Actualizar una talla
const updateTalla = async (id, nombre, esNinio, descripcion) => {
  const { rows } = await pool.query(
    'UPDATE tallas SET nombre = $1, es_ninio = $2, descripcion = $3 WHERE id_talla = $4 RETURNING *',
    [nombre, esNinio, descripcion, id]
  );
  return rows[0];
};

// Eliminar una talla
const deleteTalla = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM tallas WHERE id_talla = $1 RETURNING *',
    [id]
  );
  return rows[0];
};

module.exports = {
  getAllTallas,
  getTallaById,
  createTalla,
  updateTalla,
  deleteTalla,
};