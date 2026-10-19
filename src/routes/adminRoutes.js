const express = require('express');
const router = express.Router();
const {
	obtenerResumen,
	listarCupos,
	listarReservas,
	listarVehiculos,
	listarUsuarios,
	actualizarRol,
	actualizarEstado
} = require('../controllers/adminController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken, verificarRol('ADMIN'));

router.get('/resumen', obtenerResumen);
router.get('/cupos', listarCupos);
router.get('/reservas', listarReservas);
router.get('/vehiculos', listarVehiculos);
router.get('/usuarios', listarUsuarios);
router.patch('/usuarios/:id/rol', actualizarRol);
router.patch('/usuarios/:id/estado', actualizarEstado);

module.exports = router;