const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares para procesar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta "public" (HTML, CSS, JS del Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API REST
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/web/accesos', require('./routes/accesoRoutes'));

// Servir la interfaz web principal en la ruta raíz '/'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejo de puerto y arranque del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor PARKGO corriendo en el puerto ${PORT}`);
});