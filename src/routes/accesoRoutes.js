const express = require('express');
const router = express.Router();
const { validarPase, registrarCheckIn } = require('../controllers/accesoController');

router.post('/validar', validarPase);
router.post('/check-in', registrarCheckIn);

module.exports = router;