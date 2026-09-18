const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extrae el token tras "Bearer "

  if (!token) {
    return res.status(401).json({ 
      ok: false, 
      mensaje: 'Acceso denegado. Se requiere un token de autenticación.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      ok: false, 
      mensaje: 'Token inválido o expirado.' 
    });
  }
};

module.exports = { verificarToken };