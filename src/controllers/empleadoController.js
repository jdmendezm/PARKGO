const EmpleadoService = require('../services/EmpleadoService');

const obtenerVehiculos = async (req, res) => {
  try {
    const vehiculos = await EmpleadoService.obtenerVehiculos(req.usuario.id_usuario);
    return res.json({ ok: true, vehiculos });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ok: false, message: error.message || 'Error al consultar vehículos' });
  }
};

const obtenerCuposDisponibles = async (req, res) => {
  try {
    const idUsuario = req.usuario ? req.usuario.id_usuario : null;
    const cupos = await EmpleadoService.obtenerCuposDisponibles(idUsuario, req.query.tipoVehiculo);
    return res.json({ ok: true, cupos });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ok: false, message: error.message || 'Error al consultar cupos disponibles' });
  }
};

const obtenerPaseActivo = async (req, res) => {
  try {
    const idUsuario = req.usuario ? req.usuario.id_usuario : null;
    const pase = await EmpleadoService.obtenerPaseActivo(idUsuario);
    return res.json({
      ok: true,
      pase
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ok: false, message: error.message || 'Error al obtener pase activo' });
  }
};

const crearReserva = async (req, res) => {
  try {
    const idUsuario = req.usuario ? req.usuario.id_usuario : null;
    const reserva = await EmpleadoService.crearReserva(idUsuario, req.body);
    return res.json({
      ok: true,
      ...reserva
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ok: false, message: error.message || 'Error al crear reserva' });
  }
};

const obtenerHistorial = async (req, res) => {
  try {
    const idUsuario = req.usuario ? req.usuario.id_usuario : null;
    const historial = await EmpleadoService.obtenerHistorial(idUsuario);
    return res.json({
      ok: true,
      historial
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ok: false, message: error.message || 'Error al consultar historial' });
  }
};

module.exports = { obtenerVehiculos, obtenerCuposDisponibles, obtenerPaseActivo, crearReserva, obtenerHistorial };
