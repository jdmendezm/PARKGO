const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares de Seguridad HTTP & CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Deshabilitar encabezado de tecnología para prevenir fingerprinting
app.disable('x-powered-by');

// Cabeceras básicas de seguridad HTTP
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middlewares para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta "public" (Frontend en Naranja y Blanco)
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API REST PARKGO
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/web/accesos', require('./routes/accesoRoutes'));
app.use('/api/v1/mobile/empleado', require('./routes/empleadoRoutes'));

// Servir la interfaz web principal como fallback para SPA
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejo centralizado de errores 500
app.use((err, req, res, next) => {
  console.error('❌ Error no capturado:', err);
  res.status(500).json({
    ok: false,
    message: 'Ocurrió un error interno en el servidor.'
  });
});

// Manejo de puerto y arranque del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Servidor PARKGO corriendo en el puerto ${PORT}`);
  console.log(`🔒 Sistema de Seguridad y Módulo de Clases Activos`);
  console.log(`🎨 Tema: Naranja y Blanco (Portería Web & Empleado)`);
  console.log(`===================================================`);
});