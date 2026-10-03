const jwt = require('jsonwebtoken');

/**
 * Middleware para validar el Token JWT de Autenticación.
 */
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extrae el token tras "Bearer "

  if (!token) {
    return res.status(401).json({ 
      ok: false, 
      mensaje: 'Acceso denegado. Se requiere token de autenticación (Bearer Token).' 
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ CRÍTICO: JWT_SECRET no está configurada.');
      return res.status(500).json({ ok: false, mensaje: 'Error de configuración en el servidor de autenticación.' });
    }

    const decoded = jwt.verify(token, secret);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      ok: false, 
      mensaje: 'Token de acceso inválido o expirado. Inicie sesión nuevamente.' 
    });
  }
};

/**
 * Middleware para Control de Acceso Basado en Roles (RBAC).
 * Permite especificar qué roles pueden acceder a una ruta (Ej: 'GUARDA', 'EMPLEADO', 'ADMIN').
 */
const normalizarRol = (rol) => {
  if (!rol) return '';
  const valor = String(rol).toUpperCase();
  return valor === 'EMPLEADO_CONDUCTOR' ? 'EMPLEADO' : valor;
};

const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !req.usuario.rol) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso restringido. Información de rol no encontrada en el token.'
      });
    }

    const rolUsuario = normalizarRol(req.usuario.rol);
    const rolesNormalizados = rolesPermitidos.map(r => normalizarRol(r));

    if (!rolesNormalizados.includes(rolUsuario) && rolUsuario !== 'ADMIN') {
      return res.status(403).json({
        ok: false,
        mensaje: `Acceso no autorizado para el rol '${rolUsuario}'. Se requiere uno de los siguientes roles: ${rolesNormalizados.join(', ')}`
      });
    }

    next();
  };
};

module.exports = { verificarToken, verificarRol };