const { Pool } = require('pg');
require('dotenv').config();
 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL requerido por Supabase.
  /*ssl: {
    rejectUnauthorized: false,
  },*/
});
 
// Verificación de conexión al arrancar el servidor
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
    return;
  }
  release();
  console.log('Conexión a PostgreSQL establecida correctamente.');
});
 
module.exports = pool;
 