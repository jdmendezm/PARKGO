const db = require('../config/db');

// Validar y obtener detalles de un pase/reserva
const validarPase = async (req, res) => {
  const { codigo } = req.body;

  try {
    const result = await db.query(
      `SELECT 
        r.id_reserva,
        r.codigo_alfanumerico,
        r.estado_reserva,
        c.codigo_espacio AS cupo,
        v.placa,
        v.tipo_vehiculo,
        v.marca,
        v.modelo,
        u.nombres || ' ' || u.apellidos AS nombre_usuario,
        u.correo_corporativo
       FROM reserva r
       JOIN cupo_parqueo c ON r.id_cupo = c.id_cupo
       JOIN vehiculo v ON r.id_vehiculo = v.id_vehiculo
       JOIN usuario u ON r.id_usuario = u.id_usuario
       WHERE r.codigo_alfanumerico = $1`,
      [codigo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva o pase no encontrado' });
    }

    const data = result.rows[0];

    return res.json({
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
    });
  } catch (error) {
    console.error('Error al validar pase:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Registrar Check-In (Entrada)
const checkIn = async (req, res) => {
  const { codigo } = req.body;

  try {
    // 1. Obtener información de la reserva y del usuario
    const reservaQuery = await db.query(
      `SELECT r.id_reserva, r.id_cupo, r.id_usuario, r.estado_reserva, c.codigo_espacio 
       FROM reserva r
       JOIN cupo_parqueo c ON r.id_cupo = c.id_cupo
       WHERE r.codigo_alfanumerico = $1`,
      [codigo]
    );

    if (reservaQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada.' });
    }

    const reserva = reservaQuery.rows[0];

    if (reserva.estado_reserva === 'EN_SITIO') {
      return res.status(400).json({ message: 'El vehículo ya se encuentra en sitio.' });
    }

    if (reserva.estado_reserva === 'FINALIZADA') {
      return res.status(400).json({ message: 'Esta reserva ya fue completada anteriormente.' });
    }

    // 2. Insertar el registro de acceso (con id_usuario de respaldo)
    try {
      await db.query(
        `INSERT INTO registro_acceso (id_reserva, id_usuario, hora_entrada) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [reserva.id_reserva, reserva.id_usuario]
      );
    } catch (errInsert) {
      // Si la columna id_usuario no existe o no es obligatoria, intentar sin ella:
      await db.query(
        `INSERT INTO registro_acceso (id_reserva, hora_entrada) VALUES ($1, CURRENT_TIMESTAMP)`,
        [reserva.id_reserva]
      );
    }

    // 3. Cambiar estado de la reserva a 'EN_SITIO'
    await db.query(
      `UPDATE reserva SET estado_reserva = 'EN_SITIO' WHERE id_reserva = $1`,
      [reserva.id_reserva]
    );

    // 4. Cambiar estado del cupo a 'OCUPADO'
    await db.query(
      `UPDATE cupo_parqueo SET estado_cupo = 'OCUPADO' WHERE id_cupo = $1`,
      [reserva.id_cupo]
    );

    return res.json({
      message: '✅ Check-In registrado con éxito.',
      cupo: reserva.codigo_espacio,
      hora_entrada: new Date().toLocaleTimeString()
    });
  } catch (error) {
    console.error('Error detallado en Check-In:', error);
    return res.status(500).json({ message: 'Error interno del servidor al procesar ingreso.' });
  }
};

// Registrar Check-Out (Salida)
const checkOut = async (req, res) => {
  const { codigo } = req.body;

  try {
    const reservaQuery = await db.query(
      `SELECT r.id_reserva, r.id_cupo, r.estado_reserva, c.codigo_espacio 
       FROM reserva r
       JOIN cupo_parqueo c ON r.id_cupo = c.id_cupo
       WHERE r.codigo_alfanumerico = $1 AND r.estado_reserva = 'EN_SITIO'`,
      [codigo]
    );

    if (reservaQuery.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontró un vehículo activo en sitio con este código para Check-Out.' 
      });
    }

    const reserva = reservaQuery.rows[0];

    // 1. Registrar hora de salida
    await db.query(
      `UPDATE registro_acceso 
       SET hora_salida = CURRENT_TIMESTAMP 
       WHERE id_reserva = $1 AND hora_salida IS NULL`,
      [reserva.id_reserva]
    );

    // 2. Cambiar estado de la reserva a 'FINALIZADA'
    await db.query(
      `UPDATE reserva SET estado_reserva = 'FINALIZADA' WHERE id_reserva = $1`,
      [reserva.id_reserva]
    );

    // 3. Liberar el cupo
    await db.query(
      `UPDATE cupo_parqueo SET estado_cupo = 'DISPONIBLE' WHERE id_cupo = $1`,
      [reserva.id_cupo]
    );

    return res.json({
      message: '✅ Check-Out registrado con éxito. Cupo liberado.',
      cupo: reserva.codigo_espacio,
      hora_salida: new Date().toLocaleTimeString()
    });
  } catch (error) {
    console.error('Error detallado en Check-Out:', error);
    return res.status(500).json({ message: 'Error interno del servidor al procesar la salida.' });
  }
};

module.exports = { validarPase, checkIn, checkOut };