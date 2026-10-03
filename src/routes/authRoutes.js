const express = require('express');
const router = express.Router();
const { login, obtenerPerfil, registrar } = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.post('/login', login);
router.post('/registro', registrar);  // Pública: no requiere token
router.get('/me', verificarToken, obtenerPerfil);

module.exports = router;