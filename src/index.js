const express = require('express');
const path = require('path');
const app = express();

// 1. Middlewares para parsear JSON
app.use(express.json());

// 2. Servir archivos estáticos (HTML, JS, CSS) desde la carpeta public
app.use(express.static(path.join(__dirname, '../public')));

// 3. Rutas de la API (Mantienen el prefijo /api/v1)
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/web/accesos', require('./routes/accesoRoutes'));

// 4. Ruta por defecto para enviar la interfaz gráfica en la raíz '/'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor PARKGO corriendo en http://localhost:${PORT}`);
});