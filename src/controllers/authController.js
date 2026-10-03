const AuthService = require('../services/AuthService');

const login = async (req, res) => {
  try {
    const { correo_corporativo, password } = req.body;
    const resultado = await AuthService.login(correo_corporativo, password);
    return res.json({
      ok: true,
      message: 'Autenticación exitosa en PARKGO',
      ...resultado
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      ok: false,
      message: error.message || 'Error interno del servidor al autenticar'
    });
  }
};

const obtenerPerfil = async (req, res) => {
  try {
    return res.json({
      ok: true,
      usuario: req.usuario
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al consultar perfil.' });
  }
};

const registrar = async (req, res) => {
  try {
    const { correo_corporativo, password, nombres, apellidos, cargo } = req.body;
    const resultado = await AuthService.registrar({ correo_corporativo, password, nombres, apellidos, cargo });
    return res.status(201).json({
      ok: true,
      ...resultado
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      ok: false,
      message: error.message || 'Error interno al registrar la cuenta'
    });
  }
};

module.exports = { login, obtenerPerfil, registrar };