const jwt = require('jsonwebtoken');
const getJwtSecret = require('../config/jwtSecret');
const db = require('../config/db');

/**
 * Middleware para validar el Token JWT de Autenticación.
 */
const verificarToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const bearerMatch = /^Bearer\s+(\S+)$/i.exec(authHeader || '');
  const token = bearerMatch && bearerMatch[1];

  if (!token) {
    return res.status(401).json({
      ok: false, 
      mensaje: 'Acceso denegado. Se requiere token de autenticación (Bearer Token).' 
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  } catch (error) {
    if (error.code === 'JWT_SECRET_INVALID') {
      console.error('❌ CRÍTICO: JWT_SECRET no está configurada correctamente.');
      return res.status(500).json({ ok: false, mensaje: 'Error de configuración en el servidor de autenticación.' });
    }
    return res.status(401).json({
      ok: false, 
      mensaje: 'Token de acceso inválido o expirado. Inicie sesión nuevamente.' 
    });
  }

  let usuarioActual;
  try {
    const result = await db.query(
      `SELECT id_usuario, id_empresa, id_sede, nombres, apellidos,
              correo_corporativo, rol_sistema, estado_usuario
       FROM usuario
       WHERE id_usuario = $1
       LIMIT 1`,
      [decoded.id_usuario]
    );
    usuarioActual = result.rows?.[0];
  } catch (error) {
    console.error('No se pudo verificar el estado actual de la cuenta:', error.message);
    return res.status(503).json({ ok: false, mensaje: 'No fue posible verificar tu cuenta. Inténtalo de nuevo.' });
  }

  if (!usuarioActual || !usuarioActual.estado_usuario) {
    return res.status(401).json({ ok: false, mensaje: 'La cuenta está inactiva o ya no existe.' });
  }

  req.usuario = {
    ...decoded,
    id_usuario: usuarioActual.id_usuario,
    id_empresa: usuarioActual.id_empresa,
    id_sede: usuarioActual.id_sede,
    nombres: usuarioActual.nombres,
    apellidos: usuarioActual.apellidos,
    correo: usuarioActual.correo_corporativo,
    rol: usuarioActual.rol_sistema
  };
  next();
};

/**
 * Middleware para Control de Acceso Basado en Roles (RBAC).
 * Permite especificar qué roles pueden acceder a una ruta (Ej: 'GUARDA', 'EMPLEADO', 'ADMIN').
 */
const normalizarRol = (rol) => {
  if (!rol) return '';
  const valor = String(rol).toUpperCase();
  if (valor === 'ADMIN_EMPRESA' || valor === 'SUPERADMIN') return 'ADMIN';
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

module.exports = { verificarToken, verificarRol, normalizarRol };