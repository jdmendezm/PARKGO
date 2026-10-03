const express = require('express');
const router = express.Router();
const { obtenerPaseActivo, crearReserva, obtenerHistorial } = require('../controllers/empleadoController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Proteger todas las rutas de Empleado Celular con JWT y verificar rol EMPLEADO, GUARDA o ADMIN
router.use(verificarToken);
router.use(verificarRol('EMPLEADO', 'GUARDA', 'ADMIN'));

router.get('/pase-activo', obtenerPaseActivo);
router.post('/reserva', crearReserva);
router.get('/historial', obtenerHistorial);

module.exports = router;
