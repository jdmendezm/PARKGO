const db = require('../config/db');

// Validar código QR o Alfanumérico en Portería Web
const validarPase = async (req, res) => {
  const { codigo } = req.body; // Puede ser el alfanumérico (ej: PARK-8892) o el token QR

  try {
    const query = `
      SELECT 
        r.id_reserva, r.fecha_reserva, r.hora_inicio_estimada, r.hora_fin_estimada, r.estado_reserva, r.codigo_alfanumerico,
        u.nombres, u.apellidos, u.numero_documento, u.cargo,
        e.razon_social AS empresa, s.nombre_sede AS sede, a.nombre_area AS area,
        v.placa, v.tipo_vehiculo, v.marca, v.modelo, v.color,
        c.codigo_espacio, c.piso_nivel
      FROM RESERVA r
      JOIN USUARIO u ON r.id_usuario = u.id_usuario
      JOIN EMPRESA e ON u.id_empresa = e.id_empresa
      JOIN SEDE s ON r.id_cupo IN (SELECT id_cupo FROM CUPO_PARQUEO WHERE id_sede = s.id_sede)
      JOIN AREA a ON u.id_area = a.id_area
      JOIN VEHICULO v ON r.id_vehiculo = v.id_vehiculo
      JOIN CUPO_PARQUEO c ON r.id_cupo = c.id_cupo
      WHERE r.codigo_alfanumerico = $1 OR r.codigo_qr_token = $1
    `;

    const result = await db.query(query, [codigo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada o código inválido' });
    }

    return res.json({ status: 'SUCCESS', ficha_usuario: result.rows[0] });
  } catch (error) {
    console.error('Error al validar pase:', error);
    return res.status(500).json({ message: 'Error al consultar reserva' });
  }
};

// Registrar Check-in en Portería
const registrarCheckIn = async (req, res) => {
  const { id_reserva, id_guarda_ingreso, observaciones } = req.body;

  try {
    // 1. Obtener datos de la reserva
    const resQuery = await db.query('SELECT id_cupo FROM RESERVA WHERE id_reserva = $1', [id_reserva]);
    if (resQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no existe' });
    }

    const id_cupo = resQuery.rows[0].id_cupo;

    // 2. Crear REGISTRO_ACCESO y actualizar estados
    await db.query(
      `INSERT INTO REGISTRO_ACCESO (id_reserva, id_guarda_ingreso, observaciones_checkin, estado_acceso)
       VALUES ($1, $2, $3, 'EN_INSTALACION')`,
      [id_reserva, id_guarda_ingreso, observaciones || 'Ingreso normal']
    );

    await db.query(`UPDATE RESERVA SET estado_reserva = 'EN_USO' WHERE id_reserva = $1`, [id_reserva]);
    await db.query(`UPDATE CUPO_PARQUEO SET estado_disponibilidad = 'OCUPADO' WHERE id_cupo = $1`, [id_cupo]);

    return res.json({ message: 'Check-in registrado exitosamente' });
  } catch (error) {
    console.error('Error en Check-in:', error);
    return res.status(500).json({ message: 'Error al procesar el ingreso' });
  }
};

module.exports = { validarPase, registrarCheckIn };