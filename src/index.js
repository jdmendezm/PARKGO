const express = require('express');
const path = require('path');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();

const app = express();
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);

if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS debe ser un entero mayor o igual a cero.');
}
app.set('trust proxy', trustProxyHops);

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas solicitudes. Inténtalo más tarde.' }
});
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados intentos de autenticación. Inténtalo más tarde.' }
});
const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Se alcanzó el límite de registros. Inténtalo más tarde.' }
});

// Middlewares de Seguridad HTTP & CORS
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
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

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/api', apiRateLimit);
app.use('/api/v1/auth/login', authRateLimit);
app.use('/api/v1/auth/registro', registrationRateLimit);

// Middlewares para procesar JSON y datos de formularios
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

// Servir archivos estáticos desde la carpeta "public" (Frontend en Naranja y Blanco)
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API REST PARKGO
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
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