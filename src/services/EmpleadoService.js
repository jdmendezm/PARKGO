const db = require('../config/db');
const Reserva = require('../models/Reserva');

class EmpleadoService {
  /**
   * Obtiene la reserva/pase digital activo del empleado autenticado.
   */
  static async obtenerPaseActivo(idUsuario) {
    const userId = idUsuario || 2;

    // Intentar en DB real primero
    const result = await db.query(
      `SELECT r.codigo_alfanumerico
       FROM reserva r
       WHERE r.id_usuario = $1 AND r.estado_reserva IN ('ACTIVA', 'EN_SITIO')
       ORDER BY r.id_reserva DESC LIMIT 1`,
      [userId]
    );

    if (result.rows && result.rows.length > 0) {
      const codigo = result.rows[0].codigo_alfanumerico;
      const AccesoService = require('./AccesoService');
      return await AccesoService.validarPase(codigo);
    }

    // Fallback: buscar en mock store si DB no tiene datos para este usuario
    const mockStore = db.getMockStore ? db.getMockStore() : null;
    if (mockStore) {
      const activeRes = mockStore.reservas.find(
        r => r.id_usuario == userId && (r.estado_reserva === 'ACTIVA' || r.estado_reserva === 'EN_SITIO')
      );
      if (activeRes) {
        const AccesoService = require('./AccesoService');
        return await AccesoService.validarPase(activeRes.codigo_alfanumerico);
      }
    }

    return null;
  }

  /**
   * Genera un nuevo pase de parqueo / reserva para el empleado.
   * Usa columnas reales de Neon: hora_inicio_estimada, hora_fin_estimada, codigo_qr_token
   */
  static async crearReserva(idUsuario, { tipoVehiculo, placa, fecha, horaEntrada }) {
    const userId = idUsuario || 2;
    const tipoVehiculoNormalizado = String(tipoVehiculo || 'CARRO').toUpperCase();
    const tipoVehiculoFinal = tipoVehiculoNormalizado === 'CAMIONETA' ? 'CARRO' : tipoVehiculoNormalizado;
    const nuevoCodigo = Reserva.generarCodigoUnico();
    const horaFin = '20:00';
    const horaInicio = horaEntrada || '08:00';
    const fechaReserva = fecha || new Date().toISOString().split('T')[0];

    // Intentar en DB real
    try {
      // 1. Buscar cupo disponible del tipo requerido en DB
      const cupoResult = await db.query(
        `SELECT id_cupo, codigo_espacio
         FROM cupo_parqueo
         WHERE estado_disponibilidad IN ('LIBRE', 'RESERVADO')
           AND (tipo_cupo = $1 OR $1 IS NULL)
         ORDER BY codigo_espacio LIMIT 1`,
        [tipoVehiculoFinal || null]
      );

      if (!cupoResult.rows || cupoResult.rows.length === 0) {
        const err = new Error('No hay cupos disponibles para el tipo de vehículo solicitado.');
        err.status = 409;
        throw err;
      }

      const cupo = cupoResult.rows[0];

      // 2. Buscar o crear vehículo
      let vehiculoId;
      const vehExiste = await db.query(
        `SELECT id_vehiculo FROM vehiculo WHERE placa = $1 AND id_usuario = $2`,
        [placa, userId]
      );

      if (vehExiste.rows && vehExiste.rows.length > 0) {
        vehiculoId = vehExiste.rows[0].id_vehiculo;
      } else {
        const nuevoVeh = await db.query(
          `INSERT INTO vehiculo (id_usuario, placa, tipo_vehiculo, marca, modelo, color)
           VALUES ($1, $2, $3, 'Sin Especificar', 'Sin Especificar', 'Sin Especificar')
           RETURNING id_vehiculo`,
          [userId, placa || 'SIN-PLACA', tipoVehiculoFinal || 'CARRO']
        );
        vehiculoId = nuevoVeh.rows[0].id_vehiculo;
      }

      // 3. Crear la reserva con columnas reales de Neon
      await db.query(
        `INSERT INTO reserva
           (id_usuario, id_cupo, id_vehiculo, fecha_reserva, hora_inicio_estimada, hora_fin_estimada,
            estado_reserva, codigo_alfanumerico, codigo_qr_token)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVA', $7, $8)`,
        [userId, cupo.id_cupo, vehiculoId, fechaReserva, horaInicio, horaFin, nuevoCodigo, nuevoCodigo]
      );

      // 4. Marcar cupo como RESERVADO
      await db.query(
        `UPDATE cupo_parqueo SET estado_disponibilidad = 'RESERVADO' WHERE id_cupo = $1`,
        [cupo.id_cupo]
      );

      return {
        message: '🎉 Pase de parqueo generado con éxito.',
        codigo: nuevoCodigo,
        cupo: cupo.codigo_espacio,
        placa: placa || 'SIN-PLACA',
        estado: 'ACTIVA'
      };

    } catch (err) {
      // Si la DB falla, usar mock store
      if (err.status === 409) throw err; // Propagar errores de negocio

      const mockStore = db.getMockStore ? db.getMockStore() : null;
      if (mockStore) {
        let cupoLibre = mockStore.cupos.find(
          c => c.estado_disponibilidad === 'DISPONIBLE' && c.tipo_cupo === (tipoVehiculoFinal || 'CARRO')
        );
        if (!cupoLibre) {
          cupoLibre = mockStore.cupos.find(c => c.estado_disponibilidad === 'DISPONIBLE') || mockStore.cupos[0];
        }
        cupoLibre.estado_disponibilidad = 'RESERVADO';

        let vehiculo = mockStore.vehiculos.find(v => v.placa === placa);
        if (!vehiculo) {
          vehiculo = {
            id_vehiculo: mockStore.vehiculos.length + 1,
            id_usuario: userId,
            placa: placa || 'ABC-999',
            tipo_vehiculo: tipoVehiculoFinal || 'CARRO',
            marca: 'Toyota',
            modelo: 'Corolla',
            color: 'Naranja'
          };
          mockStore.vehiculos.push(vehiculo);
        }

        const nuevaRes = {
          id_reserva: mockStore.reservas.length + 1,
          codigo_alfanumerico: nuevoCodigo,
          id_cupo: cupoLibre.id_cupo,
          id_vehiculo: vehiculo.id_vehiculo,
          id_usuario: userId,
          estado_reserva: 'ACTIVA',
          fecha_reserva: fechaReserva,
          hora_inicio_estimada: horaInicio,
          hora_fin_estimada: horaFin
        };
        mockStore.reservas.push(nuevaRes);

        return {
          message: '🎉 Pase de parqueo generado con éxito.',
          codigo: nuevoCodigo,
          cupo: cupoLibre.codigo_espacio,
          placa: placa || 'SIN-PLACA',
          estado: 'ACTIVA'
        };
      }

      throw err;
    }
  }

  /**
   * Historial de reservas/accesos del empleado.
   */
  static async obtenerHistorial(idUsuario) {
    const userId = idUsuario || 2;

    // Intentar en DB real
    const result = await db.query(
      `SELECT
        r.codigo_alfanumerico AS codigo,
        c.codigo_espacio      AS cupo,
        v.marca || ' (' || v.placa || ')' AS vehiculo,
        r.fecha_reserva       AS fecha,
        r.estado_reserva      AS estado
       FROM reserva r
       JOIN cupo_parqueo c ON r.id_cupo    = c.id_cupo
       JOIN vehiculo     v ON r.id_vehiculo = v.id_vehiculo
       WHERE r.id_usuario = $1
       ORDER BY r.id_reserva DESC LIMIT 20`,
      [userId]
    );

    if (result.rows && result.rows.length > 0) {
      return result.rows;
    }

    // Fallback al mock store
    const mockStore = db.getMockStore ? db.getMockStore() : null;
    if (mockStore) {
      return mockStore.reservas
        .filter(r => r.id_usuario == userId)
        .map(r => {
          const c = mockStore.cupos.find(cupo => cupo.id_cupo === r.id_cupo);
          const v = mockStore.vehiculos.find(veh => veh.id_vehiculo === r.id_vehiculo);
          return {
            codigo: r.codigo_alfanumerico,
            cupo: c ? c.codigo_espacio : 'A-101',
            vehiculo: v ? `${v.marca} (${v.placa})` : 'Vehículo',
            fecha: r.fecha_reserva,
            estado: r.estado_reserva
          };
        });
    }

    return [];
  }
}

module.exports = EmpleadoService;
