
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const direccionRoutes = require('./routes/direccion.routes');
const pedidoRoutes = require('./routes/pedido.routes');
const productoRoutes = require('./routes/productoRoutes');

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ------ Middlewares ------
app.use(cors());
app.use(express.json());

// ------ Rutas API ------
app.use('/api/auth', authRoutes);
app.use('/api/direcciones', direccionRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api', productoRoutes);

// ------ Archivos subidos (imágenes) ------
// Ruta actual: database/uploads/
app.use('/database/uploads', express.static(path.join(__dirname, '..', 'database', 'uploads')));
// Alias de compatibilidad con registros anteriores guardados como /uploads/
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ------ Frontend estático ------
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Rutas del frontend
app.get('/',          (_req, res) => res.redirect('/login'));
app.get('/login',     (_req, res) => res.sendFile(path.join(frontendPath, 'views', 'login.html')));
app.get('/registro',  (_req, res) => res.sendFile(path.join(frontendPath, 'views', 'registro.html')));

// ------ Arranque ------
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});