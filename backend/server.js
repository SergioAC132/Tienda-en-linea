
const express = require('express');
const dotenv = require('dotenv');
const pool = require('./config/db');
const authRoutes = require('./routes/auth.routes')

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ------ Middlewares ------
app.use(express.json());

// ------ Rutas ------
app.use('/api/auth', authRoutes);

// ------ Arranque ------
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});