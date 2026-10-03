const express = require('express');
const router = express.Router();
const { obtenerCatalogo, validarPase, checkIn, checkOut } = require('../controllers/accesoController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Proteger todas las rutas del módulo de Portería Web con JWT y verificar rol GUARDA o ADMIN
router.use(verificarToken);
router.use(verificarRol('GUARDA', 'ADMIN'));

router.get('/catalogo', obtenerCatalogo);
router.post('/validar', validarPase);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

module.exports = router;