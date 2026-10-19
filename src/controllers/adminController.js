const AdminService = require('../services/AdminService');

const responderError = (res, error) => {
  const status = error.status || 500;
  if (status >= 500) console.error('Error en administración:', error);
  return res.status(status).json({
    ok: false,
    message: status >= 500 ? 'Ocurrió un error al procesar la operación administrativa.' : error.message
  });
};

const listarCupos = async (req, res) => {
  try {
    const cupos = await AdminService.listarCupos(req.usuario);
    return res.json({ ok: true, cupos });
  } catch (error) {
    return responderError(res, error);
  }
};

const obtenerResumen = async (req, res) => {
  try {
    const resumen = await AdminService.obtenerResumen(req.usuario);
    return res.json({ ok: true, resumen });
  } catch (error) {
    return responderError(res, error);
  }
};

const listarReservas = async (req, res) => {
  try {
    const reservas = await AdminService.listarReservas(req.usuario);
    return res.json({ ok: true, reservas });
  } catch (error) {
    return responderError(res, error);
  }
};

const listarVehiculos = async (req, res) => {
  try {
    const vehiculos = await AdminService.listarVehiculos(req.usuario);
    return res.json({ ok: true, vehiculos });
  } catch (error) {
    return responderError(res, error);
  }
};

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await AdminService.listarUsuarios(req.usuario);
    return res.json({ ok: true, usuarios });
  } catch (error) {
    return responderError(res, error);
  }
};

const actualizarRol = async (req, res) => {
  try {
    const usuario = await AdminService.actualizarRol(
      req.usuario,
      req.params.id,
      req.body.rol_sistema
    );
    return res.json({ ok: true, usuario });
  } catch (error) {
    return responderError(res, error);
  }
};

const actualizarEstado = async (req, res) => {
  try {
    const usuario = await AdminService.actualizarEstado(
      req.usuario,
      req.params.id,
      req.body.estado_usuario
    );
    return res.json({ ok: true, usuario });
  } catch (error) {
    return responderError(res, error);
  }
};

module.exports = { listarCupos, obtenerResumen, listarReservas, listarVehiculos, listarUsuarios, actualizarRol, actualizarEstado };