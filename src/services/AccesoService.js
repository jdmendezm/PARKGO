const db = require('../config/db');
const Reserva = require('../models/Reserva');

class AccesoService {
  /**
   * Obtener lista completa del catálogo de cupos y accesos para la portería.
   * Usa los nombres de columna reales de Neon.
   */
  static async obtenerCatalogo() {
    const result = await db.query(`
      WITH reserva_activa AS (
        SELECT r.*,
               ROW_NUMBER() OVER (
                 PARTITION BY r.id_cupo
                 ORDER BY r.id_reserva DESC
               ) AS rn
        FROM reserva r
        WHERE r.estado_reserva IN ('ACTIVA', 'EN_USO')
      )
      SELECT
        c.id_cupo,
        c.codigo_espacio,
        c.tipo_cupo,
        CASE
          WHEN c.estado_disponibilidad = 'LIBRE' THEN 'DISPONIBLE'
          ELSE c.estado_disponibilidad
        END AS estado_cupo,
        c.piso_nivel              AS piso,
        r.codigo_alfanumerico     AS codigo_pase,
        r.estado_reserva,
        v.placa,
        v.marca || ' ' || v.modelo AS vehiculo_info,
        u.nombres || ' ' || u.apellidos AS nombre_usuario
      FROM cupo_parqueo c
      LEFT JOIN reserva_activa r
        ON r.id_cupo = c.id_cupo AND r.rn = 1
      LEFT JOIN vehiculo v ON r.id_vehiculo = v.id_vehiculo
      LEFT JOIN usuario u ON r.id_usuario   = u.id_usuario
      ORDER BY c.codigo_espacio
    `);
    return result.rows || [];
  }

  /**
   * Validar y consultar detalles de un pase o reserva por código alfanumérico.
   */
  static async validarPase(codigo) {
    if (!codigo) {
      const err = new Error('El código del pase es requerido.');
      err.status = 400;
      throw err;
    }

    const codigoLimpio = String(codigo).trim().toUpperCase();

    const result = await db.query(
      `SELECT
        r.id_reserva,
        r.codigo_alfanumerico,
        r.estado_reserva,
        c.codigo_espacio          AS cupo,
        v.placa,
        v.tipo_vehiculo,
        v.marca,
        v.modelo,
        u.nombres || ' ' || u.apellidos AS nombre_usuario,
        u.correo_corporativo
       FROM reserva r
       JOIN cupo_parqueo c ON r.id_cupo    = c.id_cupo
       JOIN vehiculo     v ON r.id_vehiculo = v.id_vehiculo
       JOIN usuario      u ON r.id_usuario  = u.id_usuario
       WHERE r.codigo_alfanumerico = $1
         AND r.estado_reserva IN ('ACTIVA', 'EN_USO')`,
      [codigoLimpio]
    );

    if (!result.rows || result.rows.length === 0) {
      const err = new Error(`El pase con código '${codigoLimpio}' no existe o fue anulado.`);
      err.status = 404;
      throw err;
    }

    const data = result.rows[0];

    return {
      codigo: data.codigo_alfanumerico,
      estado: data.estado_reserva,
      cupo: data.cupo,
      vehiculo: {
        placa: data.placa,
        tipo: data.tipo_vehiculo,
        marca: data.marca,
        modelo: data.modelo
      },
      usuario: {
        nombre: data.nombre_usuario,
        correo: data.correo_corporativo
      }
    };
  }

  /**
   * Registrar la ENTRADA (Check-In) en portería.
   * Columnas reales: estado_disponibilidad, piso_nivel, fecha_hora_ingreso, estado_acceso
   */
  static async registrarCheckIn(codigo, idGuarda) {
    if (!codigo) {
      const err = new Error('Código de pase inválido para Check-In.');
      err.status = 400;
      throw err;
    }

    const codigoLimpio = String(codigo).trim().toUpperCase();

    return db.withTransaction(async query => {
      const result = await query(
        `SELECT r.id_reserva, r.id_cupo, r.estado_reserva, c.codigo_espacio
         FROM reserva r
         JOIN cupo_parqueo c ON r.id_cupo = c.id_cupo
         WHERE r.codigo_alfanumerico = $1
         FOR UPDATE OF r, c`,
        [codigoLimpio]
      );

      if (!result.rows || result.rows.length === 0) {
        const err = new Error('Reserva no encontrada.');
        err.status = 404;
        throw err;
      }

      const reserva = result.rows[0];
      if (reserva.estado_reserva !== 'ACTIVA') {
        const err = new Error(reserva.estado_reserva === 'EN_USO'
          ? 'El vehículo ya se encuentra dentro de las instalaciones.'
          : 'Esta reserva no está disponible para Check-In.');
        err.status = 409;
        throw err;
      }

      await query('LOCK TABLE registro_acceso IN EXCLUSIVE MODE');
      const siguienteId = await query('SELECT COALESCE(MAX(id_acceso), 0) + 1 AS siguiente_id FROM registro_acceso');
      await query(
        `INSERT INTO registro_acceso (id_acceso, id_reserva, id_guarda_ingreso, fecha_hora_ingreso, estado_acceso)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'EN_INSTALACION')`,
        [siguienteId.rows[0].siguiente_id, reserva.id_reserva, idGuarda || null]
      );
      await query(`UPDATE reserva SET estado_reserva = 'EN_USO' WHERE id_reserva = $1`, [reserva.id_reserva]);
      await query(`UPDATE cupo_parqueo SET estado_disponibilidad = 'OCUPADO' WHERE id_cupo = $1`, [reserva.id_cupo]);

      return {
        message: 'Check-In registrado exitosamente en portería.',
        cupo: reserva.codigo_espacio,
        hora_entrada: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
    });
  }

  /**
   * Registrar la SALIDA (Check-Out) en portería.
   */
  static async registrarCheckOut(codigo) {
    if (!codigo) {
      const err = new Error('Código de pase inválido para Check-Out.');
      err.status = 400;
      throw err;
    }

    const codigoLimpio = String(codigo).trim().toUpperCase();

    return db.withTransaction(async query => {
      const result = await query(
        `SELECT r.id_reserva, r.id_cupo, r.estado_reserva, c.codigo_espacio
         FROM reserva r
         JOIN cupo_parqueo c ON r.id_cupo = c.id_cupo
         WHERE r.codigo_alfanumerico = $1
         FOR UPDATE OF r, c`,
        [codigoLimpio]
      );

      if (!result.rows || result.rows.length === 0 || result.rows[0].estado_reserva !== 'EN_USO') {
        const err = new Error('No se encontró un vehículo activo en sitio con este código.');
        err.status = 404;
        throw err;
      }

      const reserva = result.rows[0];
      await query(
        `UPDATE registro_acceso
         SET fecha_hora_salida = CURRENT_TIMESTAMP, estado_acceso = 'FINALIZADO'
         WHERE id_reserva = $1 AND estado_acceso = 'EN_INSTALACION'`,
        [reserva.id_reserva]
      );
      await query(`UPDATE reserva SET estado_reserva = 'COMPLETADA' WHERE id_reserva = $1`, [reserva.id_reserva]);
      await query(`UPDATE cupo_parqueo SET estado_disponibilidad = 'LIBRE' WHERE id_cupo = $1`, [reserva.id_cupo]);

      return {
        message: 'Check-Out registrado exitosamente. Cupo liberado.',
        cupo: reserva.codigo_espacio,
        hora_salida: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
    });
  }
}

module.exports = AccesoService;
