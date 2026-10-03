const db = require('../config/db');
const Reserva = require('../models/Reserva');

class EmpleadoService {
  static async obtenerPaseActivo(idUsuario) {
    const userId = idUsuario || 2;
    const result = await db.query(
      `SELECT r.codigo_alfanumerico
       FROM reserva r
       WHERE r.id_usuario = $1 AND r.estado_reserva IN ('ACTIVA', 'EN_USO')
       ORDER BY r.id_reserva DESC LIMIT 1`,
      [userId]
    );

    if (result.rows && result.rows.length > 0) {
      const AccesoService = require('./AccesoService');
      return AccesoService.validarPase(result.rows[0].codigo_alfanumerico);
    }

    const mockStore = db.getMockStore ? db.getMockStore() : null;
    if (mockStore) {
      const activeRes = mockStore.reservas.find(
        reservation => reservation.id_usuario == userId &&
          ['ACTIVA', 'EN_USO'].includes(reservation.estado_reserva)
      );
      if (activeRes) {
        const AccesoService = require('./AccesoService');
        return AccesoService.validarPase(activeRes.codigo_alfanumerico);
      }
    }

    return null;
  }

  static async crearReserva(idUsuario, { tipoVehiculo, placa, fecha, horaEntrada } = {}) {
    const userId = idUsuario || 2;
    const tipoVehiculoNormalizado = String(tipoVehiculo || 'CARRO').toUpperCase();
    const tipoVehiculoFinal = tipoVehiculoNormalizado === 'CAMIONETA' ? 'CARRO' : tipoVehiculoNormalizado;
    const nuevoCodigo = Reserva.generarCodigoUnico();
    const horaFin = '20:00';
    const horaInicio = horaEntrada || '08:00';
    const fechaReserva = fecha || new Date().toISOString().split('T')[0];

    const reservaExistente = await db.query(
      `SELECT id_reserva FROM reserva
       WHERE id_usuario = $1 AND estado_reserva IN ('ACTIVA', 'EN_USO')
       LIMIT 1`,
      [userId]
    );

    if (reservaExistente.rows && reservaExistente.rows.length > 0) {
      const err = new Error('Ya tienes un cupo activo asignado. Solo puedes tener una reserva vigente a la vez.');
      err.status = 409;
      throw err;
    }

    const mockStore = db.getMockStore ? db.getMockStore() : null;
    if (mockStore && mockStore.reservas.some(r => r.id_usuario == userId && ['ACTIVA', 'EN_USO'].includes(r.estado_reserva))) {
      const err = new Error('Ya tienes un cupo activo asignado. Solo puedes tener una reserva vigente a la vez.');
      err.status = 409;
      throw err;
    }

    try {
      return await db.withTransaction(async query => {
        const cupoResult = await query(
          `SELECT id_cupo, codigo_espacio
           FROM cupo_parqueo
           WHERE estado_disponibilidad = 'LIBRE' AND tipo_cupo = $1
           ORDER BY codigo_espacio
           LIMIT 1
           FOR UPDATE SKIP LOCKED`,
          [tipoVehiculoFinal]
        );

        if (!cupoResult.rows || cupoResult.rows.length === 0) {
          const err = new Error('No hay cupos disponibles para el tipo de vehículo solicitado.');
          err.status = 409;
          throw err;
        }

        const cupo = cupoResult.rows[0];
        const vehExiste = await query(
          'SELECT id_vehiculo FROM vehiculo WHERE placa = $1 AND id_usuario = $2',
          [placa, userId]
        );

        let vehiculoId;
        if (vehExiste.rows && vehExiste.rows.length > 0) {
          vehiculoId = vehExiste.rows[0].id_vehiculo;
        } else {
          const nuevoVeh = await query(
            `INSERT INTO vehiculo (id_usuario, placa, tipo_vehiculo, marca, modelo, color)
             VALUES ($1, $2, $3, 'Sin Especificar', 'Sin Especificar', 'Sin Especificar')
             RETURNING id_vehiculo`,
            [userId, placa || 'SIN-PLACA', tipoVehiculoFinal]
          );
          vehiculoId = nuevoVeh.rows[0].id_vehiculo;
        }

        await query(
          `INSERT INTO reserva
             (id_usuario, id_cupo, id_vehiculo, fecha_reserva, hora_inicio_estimada, hora_fin_estimada,
              estado_reserva, codigo_alfanumerico, codigo_qr_token)
           VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVA', $7, $8)`,
          [userId, cupo.id_cupo, vehiculoId, fechaReserva, horaInicio, horaFin, nuevoCodigo, nuevoCodigo]
        );

        await query(
          `UPDATE cupo_parqueo SET estado_disponibilidad = 'RESERVADO'
           WHERE id_cupo = $1 AND estado_disponibilidad = 'LIBRE'`,
          [cupo.id_cupo]
        );

        return {
          message: 'Pase de parqueo generado con éxito.',
          codigo: nuevoCodigo,
          cupo: cupo.codigo_espacio,
          placa: placa || 'SIN-PLACA',
          estado: 'ACTIVA'
        };
      });
    } catch (err) {
      if (err && err.status === 409) {
        throw err;
      }
      throw err;
    }
  }

  static async obtenerHistorial(idUsuario) {
    const userId = idUsuario || 2;
    const result = await db.query(
      `SELECT
        r.codigo_alfanumerico AS codigo,
        c.codigo_espacio      AS cupo,
        v.marca || ' (' || v.placa || ')' AS vehiculo,
        r.fecha_reserva       AS fecha,
        r.estado_reserva      AS estado
       FROM reserva r
       JOIN cupo_parqueo c ON r.id_cupo = c.id_cupo
       JOIN vehiculo v ON r.id_vehiculo = v.id_vehiculo
       WHERE r.id_usuario = $1
       ORDER BY r.id_reserva DESC LIMIT 20`,
      [userId]
    );

    if (result.rows && result.rows.length > 0) {
      return result.rows;
    }

    const mockStore = db.getMockStore ? db.getMockStore() : null;
    if (mockStore) {
      return mockStore.reservas
        .filter(reservation => reservation.id_usuario == userId)
        .map(reservation => {
          const cupo = mockStore.cupos.find(item => item.id_cupo === reservation.id_cupo);
          const vehiculo = mockStore.vehiculos.find(item => item.id_vehiculo === reservation.id_vehiculo);
          return {
            codigo: reservation.codigo_alfanumerico,
            cupo: cupo ? cupo.codigo_espacio : 'A-101',
            vehiculo: vehiculo ? `${vehiculo.marca} (${vehiculo.placa})` : 'Vehículo',
            fecha: reservation.fecha_reserva,
            estado: reservation.estado_reserva
          };
        });
    }

    return [];
  }
}

module.exports = EmpleadoService;
