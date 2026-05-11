// models/tallaModel.js  JACK BRANDON ESPINOSA NUÑEZ 2024-06-12
const pool = require('../config/db');

// Obtener todas las tallas disponibles
const getAllTallas = async () => {
  const { rows } = await pool.query('SELECT * FROM tallas ORDER BY orden ASC NULLS LAST, nombre ASC');
  return rows;
};

// Obtener una talla por ID
const getTallaById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM tallas WHERE id_talla = $1', [id]);
  return rows[0];
};

// Crear una nueva talla (se inserta al final del orden)
const createTalla = async (nombre, esNinio, descripcion) => {
  const { rows: [maxRow] } = await pool.query(
    'SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden FROM tallas'
  );
  const { rows } = await pool.query(
    'INSERT INTO tallas (nombre, es_ninio, descripcion, orden) VALUES ($1, $2, $3, $4) RETURNING *',
    [nombre, esNinio, descripcion, maxRow.next_orden]
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

// Intercambiar el orden de dos tallas
const swapOrdenTallas = async (id1, id2) => {
  const { rows } = await pool.query(
    'SELECT id_talla, orden FROM tallas WHERE id_talla IN ($1, $2)',
    [id1, id2]
  );
  if (rows.length !== 2) return null;
  const t1 = rows.find(r => +r.id_talla === +id1);
  const t2 = rows.find(r => +r.id_talla === +id2);
  await pool.query('UPDATE tallas SET orden = $1 WHERE id_talla = $2', [t2.orden, id1]);
  await pool.query('UPDATE tallas SET orden = $1 WHERE id_talla = $2', [t1.orden, id2]);
  return true;
};

module.exports = {
  getAllTallas,
  getTallaById,
  createTalla,
  updateTalla,
  deleteTalla,
  swapOrdenTallas,
};