const db = require('../config/db');

const ADMIN_ROLES = new Set(['SUPERADMIN', 'ADMIN_EMPRESA', 'GUARDA', 'EMPLEADO_CONDUCTOR']);
const USER_ROLES = new Set(['GUARDA', 'EMPLEADO_CONDUCTOR']);

class AdminService {
  static async listarCupos(actor) {
    const esSuperAdmin = actor.rol === 'SUPERADMIN';
    const result = await db.query(
      `SELECT c.id_cupo, c.codigo_espacio, c.tipo_cupo,
              c.piso_nivel, c.estado_disponibilidad,
              r.codigo_alfanumerico AS codigo_pase,
              v.placa, u.nombres, u.apellidos
       FROM cupo_parqueo c
       JOIN sede s ON s.id_sede = c.id_sede
       LEFT JOIN LATERAL (
         SELECT r.codigo_alfanumerico, r.id_vehiculo, r.id_usuario
         FROM reserva r
         WHERE r.id_cupo = c.id_cupo
           AND r.estado_reserva IN ('ACTIVA', 'EN_USO')
         ORDER BY r.id_reserva DESC
         LIMIT 1
       ) r ON TRUE
       LEFT JOIN vehiculo v ON v.id_vehiculo = r.id_vehiculo
       LEFT JOIN usuario u ON u.id_usuario = r.id_usuario
       WHERE ($1::BOOLEAN OR s.id_empresa = $2)
       ORDER BY c.codigo_espacio`,
      [esSuperAdmin, actor.id_empresa]
    );

    return result.rows || [];
  }

  static async obtenerResumen(actor) {
    const esSuperAdmin = actor.rol === 'SUPERADMIN';
    const params = [esSuperAdmin, actor.id_empresa];
    const cupos = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE c.estado_disponibilidad = 'OCUPADO') AS ocupados,
              COUNT(*) FILTER (WHERE c.estado_disponibilidad = 'LIBRE') AS disponibles,
              COUNT(*) FILTER (WHERE c.estado_disponibilidad = 'RESERVADO') AS reservados
       FROM cupo_parqueo c
       JOIN sede s ON s.id_sede = c.id_sede
       WHERE ($1::BOOLEAN OR s.id_empresa = $2)`,
      params
    );
    const reservas = await db.query(
      `SELECT COUNT(*) AS total
       FROM reserva r
       JOIN usuario u ON u.id_usuario = r.id_usuario
       WHERE ($1::BOOLEAN OR u.id_empresa = $2)
         AND r.fecha_reserva = CURRENT_DATE`,
      params
    );
    const row = cupos.rows?.[0] || {};

    return {
      totalCupos: Number(row.total || 0),
      ocupados: Number(row.ocupados || 0),
      disponibles: Number(row.disponibles || 0),
      reservados: Number(row.reservados || 0),
      reservasHoy: Number(reservas.rows?.[0]?.total || 0)
    };
  }

  static async listarReservas(actor) {
    const esSuperAdmin = actor.rol === 'SUPERADMIN';
    const result = await db.query(
      `SELECT r.id_reserva, r.codigo_alfanumerico AS codigo,
              r.fecha_reserva, r.hora_inicio_estimada, r.hora_fin_estimada,
              r.estado_reserva, c.codigo_espacio AS cupo,
              v.placa, v.tipo_vehiculo, u.nombres, u.apellidos
       FROM reserva r
       JOIN usuario u ON u.id_usuario = r.id_usuario
       JOIN cupo_parqueo c ON c.id_cupo = r.id_cupo
       JOIN vehiculo v ON v.id_vehiculo = r.id_vehiculo
       WHERE ($1::BOOLEAN OR u.id_empresa = $2)
       ORDER BY r.id_reserva DESC
       LIMIT 100`,
      [esSuperAdmin, actor.id_empresa]
    );

    return result.rows || [];
  }

  static async listarVehiculos(actor) {
    const esSuperAdmin = actor.rol === 'SUPERADMIN';
    const result = await db.query(
      `SELECT v.id_vehiculo, v.placa, v.tipo_vehiculo,
              v.marca, v.modelo, v.color, u.nombres, u.apellidos
       FROM vehiculo v
       JOIN usuario u ON u.id_usuario = v.id_usuario
       WHERE ($1::BOOLEAN OR u.id_empresa = $2)
       ORDER BY u.apellidos, u.nombres, v.placa
       LIMIT 200`,
      [esSuperAdmin, actor.id_empresa]
    );

    return result.rows || [];
  }

  static async listarUsuarios(actor) {
    const esSuperAdmin = actor.rol === 'SUPERADMIN';
    const result = await db.query(
      `SELECT id_usuario, nombres, apellidos, correo_corporativo, cargo,
              rol_sistema, estado_usuario
       FROM usuario
       WHERE ($1::BOOLEAN OR id_empresa = $2)
       ORDER BY apellidos, nombres`,
      [esSuperAdmin, actor.id_empresa]
    );

    return result.rows || [];
  }

  static async actualizarRol(actor, idUsuario, nuevoRol) {
    const userId = Number(idUsuario);
    const esSuperAdmin = actor.rol === 'SUPERADMIN';
    const rolesPermitidos = esSuperAdmin ? ADMIN_ROLES : USER_ROLES;

    if (!Number.isInteger(userId) || userId <= 0) {
      const error = new Error('El identificador de usuario no es válido.');
      error.status = 400;
      throw error;
    }
    if (!rolesPermitidos.has(nuevoRol)) {
      const error = new Error('El rol solicitado no está permitido para tu perfil.');
      error.status = 403;
      throw error;
    }
    if (userId === Number(actor.id_usuario)) {
      const error = new Error('No puedes cambiar tu propio rol.');
      error.status = 409;
      throw error;
    }

    const result = await db.query(
      `UPDATE usuario
       SET rol_sistema = $2
       WHERE id_usuario = $1 AND ($3::BOOLEAN OR id_empresa = $4)
       RETURNING id_usuario, nombres, apellidos, correo_corporativo,
                 cargo, rol_sistema, estado_usuario`,
      [userId, nuevoRol, esSuperAdmin, actor.id_empresa]
    );

    if (!result.rows || result.rows.length === 0) {
      const error = new Error('No se encontró el usuario dentro de tu ámbito administrativo.');
      error.status = 404;
      throw error;
    }

    return result.rows[0];
  }

  static async actualizarEstado(actor, idUsuario, estadoUsuario) {
    const userId = Number(idUsuario);
    const esSuperAdmin = actor.rol === 'SUPERADMIN';

    if (!Number.isInteger(userId) || userId <= 0 || typeof estadoUsuario !== 'boolean') {
      const error = new Error('El usuario o estado solicitado no es válido.');
      error.status = 400;
      throw error;
    }
    if (userId === Number(actor.id_usuario)) {
      const error = new Error('No puedes cambiar el estado de tu propia cuenta.');
      error.status = 409;
      throw error;
    }

    const result = await db.query(
      `UPDATE usuario
       SET estado_usuario = $2
       WHERE id_usuario = $1 AND ($3::BOOLEAN OR id_empresa = $4)
       RETURNING id_usuario, nombres, apellidos, correo_corporativo,
                 cargo, rol_sistema, estado_usuario`,
      [userId, estadoUsuario, esSuperAdmin, actor.id_empresa]
    );

    if (!result.rows || result.rows.length === 0) {
      const error = new Error('No se encontró el usuario dentro de tu ámbito administrativo.');
      error.status = 404;
      throw error;
    }

    return result.rows[0];
  }
}

module.exports = AdminService;