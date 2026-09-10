const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importación de rutas
const authRoutes = require('./routes/authRoutes');
const accesoRoutes = require('./routes/accesoRoutes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Registro de endpoints de la API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/web/accesos', accesoRoutes);

// Ruta de comprobación de salud (Health Check)
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API REST Backend de PARKGO Operativa 🚀',
    version: '1.0.0'
  });
});

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada en el servidor' });
});

// Puerto de ejecución
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor PARKGO corriendo en el puerto ${PORT}`);
});