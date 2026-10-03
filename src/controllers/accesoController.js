const AccesoService = require('../services/AccesoService');

const obtenerCatalogo = async (req, res) => {
  try {
    const catalogo = await AccesoService.obtenerCatalogo();
    return res.json({
      ok: true,
      catalogo
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ok: false, message: error.message || 'Error al obtener catálogo' });
  }
};

const validarPase = async (req, res) => {
  try {
    const { codigo } = req.body;
    const datosPase = await AccesoService.validarPase(codigo);
    return res.json({
      ok: true,
      ...datosPase
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ok: false, message: error.message || 'Error al validar pase' });
  }
};

const checkIn = async (req, res) => {
  try {
    const { codigo } = req.body;
    const resultado = await AccesoService.registrarCheckIn(codigo);
    return res.json({
      ok: true,
      ...resultado
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ok: false, message: error.message || 'Error al registrar Check-In' });
  }
};

const checkOut = async (req, res) => {
  try {
    const { codigo } = req.body;
    const resultado = await AccesoService.registrarCheckOut(codigo);
    return res.json({
      ok: true,
      ...resultado
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ ok: false, message: error.message || 'Error al registrar Check-Out' });
  }
};

module.exports = { obtenerCatalogo, validarPase, checkIn, checkOut };