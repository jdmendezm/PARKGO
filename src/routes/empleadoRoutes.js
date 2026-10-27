const express = require('express');
const router = express.Router();
const {
  obtenerVehiculos,
  registrarVehiculo,
  eliminarVehiculo,
  obtenerCuposDisponibles,
  obtenerPaseActivo,
  crearReserva,
  obtenerHistorial
} = require('../controllers/empleadoController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Proteger todas las rutas de Empleado Celular con JWT y verificar rol EMPLEADO, GUARDA o ADMIN
router.use(verificarToken);
router.use(verificarRol('EMPLEADO', 'GUARDA', 'ADMIN'));

router.get('/pase-activo', obtenerPaseActivo);
router.get('/vehiculos', obtenerVehiculos);
router.post('/vehiculos', registrarVehiculo);
router.delete('/vehiculos/:id', eliminarVehiculo);
router.get('/cupos', obtenerCuposDisponibles);
router.post('/reserva', crearReserva);
router.get('/historial', obtenerHistorial);

module.exports = router;
