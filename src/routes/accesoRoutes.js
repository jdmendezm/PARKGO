const express = require('express');
const router = express.Router();
const { validarPase, checkIn, checkOut } = require('../controllers/accesoController');

// Rutas del módulo de portería
router.post('/validar', validarPase);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

module.exports = router;