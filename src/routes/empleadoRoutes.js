const express = require('express');
const router = express.Router();
const { obtenerVehiculos, obtenerCuposDisponibles, obtenerPaseActivo, crearReserva, obtenerHistorial } = require('../controllers/empleadoController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Proteger todas las rutas de Empleado Celular con JWT y verificar rol EMPLEADO, GUARDA o ADMIN
router.use(verificarToken);
router.use(verificarRol('EMPLEADO', 'GUARDA', 'ADMIN'));

router.get('/pase-activo', obtenerPaseActivo);
router.get('/vehiculos', obtenerVehiculos);
router.get('/cupos', obtenerCuposDisponibles);
router.post('/reserva', crearReserva);
router.get('/historial', obtenerHistorial);

module.exports = router;
