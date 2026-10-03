const db = require('../config/db');
const Reserva = require('../models/Reserva');

class AccesoService {
  /**
   * Obtener lista completa del catálogo de cupos y accesos para la portería.
   * Usa los nombres de columna reales de Neon.
   */
  static async obtenerCatalogo() {
    const result = await db.query(`
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
      LEFT JOIN reserva r
        ON r.id_cupo = c.id_cupo AND r.estado_reserva IN ('ACTIVA','EN_SITIO')
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
       WHERE r.codigo_alfanumerico = $1`,
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

    const result = await db.query(
      `SELECT r.id_reserva, r.id_cupo, r.id_usuario, r.estado_reserva, c.codigo_espacio
       FROM reserva r
       JOIN cupo_parqueo c ON r.id_cupo = c.id_cupo
       WHERE r.codigo_alfanumerico = $1`,
      [codigoLimpio]
    );

    if (!result.rows || result.rows.length === 0) {
      const err = new Error('Reserva no encontrada.');
      err.status = 404;
      throw err;
    }

    const reserva = result.rows[0];

    if (reserva.estado_reserva === 'EN_SITIO') {
      const err = new Error('El vehículo ya se encuentra en sitio dentro de las instalaciones.');
      err.status = 400;
      throw err;
    }

    if (reserva.estado_reserva === 'FINALIZADA') {
      const err = new Error('Esta reserva ya fue completada anteriormente.');
      err.status = 400;
      throw err;
    }

    // 1. Insertar en registro_acceso con id generado para cumplir la clave/not null del esquema real de Neon
    const siguienteId = await db.query(
      `SELECT COALESCE(MAX(id_acceso), 0) + 1 AS siguiente_id FROM registro_acceso`
    );

    await db.query(
      `INSERT INTO registro_acceso (id_acceso, id_reserva, id_guarda_ingreso, fecha_hora_ingreso, estado_acceso)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'ACTIVO')`,
      [siguienteId.rows[0].siguiente_id, reserva.id_reserva, idGuarda || null]
    );

    // 2. Actualizar estado de la reserva a EN_SITIO
    await db.query(
      `UPDATE reserva SET estado_reserva = 'EN_SITIO' WHERE id_reserva = $1`,
      [reserva.id_reserva]
    );

    // 3. Actualizar estado del cupo a OCUPADO (columna real: estado_disponibilidad)
    await db.query(
      `UPDATE cupo_parqueo SET estado_disponibilidad = 'OCUPADO' WHERE id_cupo = $1`,
      [reserva.id_cupo]
    );

    return {
      message: '✅ Check-In registrado exitosamente en portería.',
      cupo: reserva.codigo_espacio,
      hora_entrada: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
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

    const result = await db.query(
      `SELECT r.id_reserva, r.id_cupo, r.estado_reserva, c.codigo_espacio
       FROM reserva r
       JOIN cupo_parqueo c ON r.id_cupo = c.id_cupo
       WHERE r.codigo_alfanumerico = $1`,
      [codigoLimpio]
    );

    if (!result.rows || result.rows.length === 0) {
      const err = new Error('No se encontró un vehículo activo en sitio con este código.');
      err.status = 404;
      throw err;
    }

    const reserva = result.rows[0];

    // 1. Registrar hora de salida en registro_acceso (columna real: fecha_hora_salida, estado_acceso)
    await db.query(
      `UPDATE registro_acceso
       SET fecha_hora_salida = CURRENT_TIMESTAMP, estado_acceso = 'CERRADO'
       WHERE id_reserva = $1 AND estado_acceso = 'ACTIVO'`,
      [reserva.id_reserva]
    );

    // 2. Cambiar estado de la reserva a FINALIZADA
    await db.query(
      `UPDATE reserva SET estado_reserva = 'FINALIZADA' WHERE id_reserva = $1`,
      [reserva.id_reserva]
    );

    // 3. Liberar el cupo (columna real: estado_disponibilidad)
    await db.query(
      `UPDATE cupo_parqueo SET estado_disponibilidad = 'LIBRE' WHERE id_cupo = $1`,
      [reserva.id_cupo]
    );

    return {
      message: '✅ Check-Out registrado exitosamente. Cupo liberado.',
      cupo: reserva.codigo_espacio,
      hora_salida: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  }
}

module.exports = AccesoService;
