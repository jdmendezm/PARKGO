const express = require('express');
const router = express.Router();
const { validarPase, registrarCheckIn } = require('../controllers/accesoController');
const { verificarToken } = require('../middlewares/authMiddleware'); // 1. Importas el middleware

// 2. Proteges las rutas pasándoles 'verificarToken' antes de la función del controlador
router.post('/validar', verificarToken, validarPase);
router.post('/check-in', verificarToken, registrarCheckIn);

module.exports = router;