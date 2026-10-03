const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

let pool = null;
let useMock = false;

const normalizeCupoStatus = (value) => {
  if (!value) return value;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'DISPONIBLE') return 'LIBRE';
  return normalized;
};

const ensureDatabaseHealth = async () => {
  if (!pool) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empresa (
        id_empresa INTEGER NOT NULL,
        nit VARCHAR(50) NOT NULL,
        razon_social VARCHAR(150) NOT NULL,
        estado_empresa BOOLEAN DEFAULT TRUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sede (
        id_sede INTEGER NOT NULL,
        id_empresa INTEGER,
        nombre_sede VARCHAR(150) NOT NULL,
        direccion VARCHAR(220) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS area (
        id_area INTEGER NOT NULL,
        id_sede INTEGER,
        nombre_area VARCHAR(120) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id_usuario INTEGER NOT NULL,
        id_empresa INTEGER,
        id_sede INTEGER,
        id_area INTEGER,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        tipo_documento VARCHAR(20) NOT NULL,
        numero_documento VARCHAR(50) NOT NULL,
        correo_corporativo VARCHAR(120) NOT NULL,
        cargo VARCHAR(100),
        rol_sistema VARCHAR(50),
        estado_usuario BOOLEAN DEFAULT TRUE,
        password VARCHAR(200)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cupo_parqueo (
        id_cupo INTEGER NOT NULL,
        id_sede INTEGER,
        codigo_espacio VARCHAR(30) NOT NULL,
        piso_nivel VARCHAR(60) NOT NULL,
        tipo_cupo VARCHAR(30),
        estado_disponibilidad VARCHAR(30)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehiculo (
        id_vehiculo INTEGER NOT NULL,
        id_usuario INTEGER,
        placa VARCHAR(30) NOT NULL,
        tipo_vehiculo VARCHAR(30),
        marca VARCHAR(60),
        modelo VARCHAR(60),
        color VARCHAR(60)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reserva (
        id_reserva INTEGER NOT NULL,
        id_usuario INTEGER,
        id_cupo INTEGER,
        id_vehiculo INTEGER,
        fecha_reserva DATE NOT NULL,
        hora_inicio_estimada TIME NOT NULL,
        hora_fin_estimada TIME NOT NULL,
        estado_reserva VARCHAR(30),
        codigo_alfanumerico VARCHAR(30) NOT NULL,
        codigo_qr_token TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS registro_acceso (
        id_acceso INTEGER NOT NULL,
        id_reserva INTEGER,
        id_guarda_ingreso INTEGER,
        fecha_hora_ingreso TIMESTAMP,
        fecha_hora_salida TIMESTAMP,
        observaciones_checkin TEXT,
        estado_acceso VARCHAR(30)
      );
    `);

    await pool.query(`
      INSERT INTO empresa (id_empresa, nit, razon_social, estado_empresa)
      SELECT 1, '900123456-1', 'Fundación Universitaria San Mateo', TRUE
      WHERE NOT EXISTS (SELECT 1 FROM empresa WHERE id_empresa = 1);
    `);

    await pool.query(`
      INSERT INTO sede (id_sede, id_empresa, nombre_sede, direccion)
      SELECT 1, 1, 'Sede Principal Calle 35', 'Calle 35 # 15-22, Bogotá'
      WHERE NOT EXISTS (SELECT 1 FROM sede WHERE id_sede = 1);
    `);

    await pool.query(`
      INSERT INTO area (id_area, id_sede, nombre_area)
      SELECT 1, 1, 'Tecnología e Sistemas'
      WHERE NOT EXISTS (SELECT 1 FROM area WHERE id_area = 1);
    `);

    await pool.query(`
      UPDATE cupo_parqueo
      SET estado_disponibilidad = 'LIBRE'
      WHERE estado_disponibilidad IN ('LIBRE', 'DISPONIBLE');
    `);

    const defaultUsers = [
      {
        id_usuario: 1,
        id_empresa: 1,
        id_sede: 1,
        id_area: 1,
        nombres: 'Carlos',
        apellidos: 'Guarda',
        tipo_documento: 'CC',
        numero_documento: '1010123456',
        correo_corporativo: 'carlos.guarda@sanmateo.edu.co',
        cargo: 'Guarda de Seguridad',
        rol_sistema: 'GUARDA',
        estado_usuario: true,
        password: 'Password123'
      },
      {
        id_usuario: 2,
        id_empresa: 1,
        id_sede: 1,
        id_area: 1,
        nombres: 'Luis',
        apellidos: 'Vargas',
        tipo_documento: 'CC',
        numero_documento: '1020304050',
        correo_corporativo: 'luis.vargas@sanmateo.edu.co',
        cargo: 'Analista de Sistemas',
        rol_sistema: 'EMPLEADO_CONDUCTOR',
        estado_usuario: true,
        password: 'Password123'
      }
    ];

    for (const user of defaultUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      const existing = await pool.query('SELECT id_usuario FROM usuario WHERE id_usuario = $1 OR correo_corporativo = $2', [user.id_usuario, user.correo_corporativo]);

      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO usuario (
            id_usuario, id_empresa, id_sede, id_area, nombres, apellidos, tipo_documento,
            numero_documento, correo_corporativo, cargo, rol_sistema, estado_usuario, password
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          user.id_usuario, user.id_empresa, user.id_sede, user.id_area, user.nombres, user.apellidos,
          user.tipo_documento, user.numero_documento, user.correo_corporativo, user.cargo,
          user.rol_sistema, user.estado_usuario, passwordHash
        ]);
      } else {
        await pool.query(`
          UPDATE usuario
          SET id_empresa = $2, id_sede = $3, id_area = $4, nombres = $5, apellidos = $6,
              tipo_documento = $7, numero_documento = $8, cargo = $9, rol_sistema = $10,
              estado_usuario = $11, password = $12
          WHERE id_usuario = $1 OR correo_corporativo = $13
        `, [
          user.id_usuario, user.id_empresa, user.id_sede, user.id_area, user.nombres, user.apellidos,
          user.tipo_documento, user.numero_documento, user.cargo, user.rol_sistema,
          user.estado_usuario, passwordHash, user.correo_corporativo
        ]);
      }
    }

    const cupos = [
      [1, 1, 'A-101', 'Piso 1', 'MOTO', 'LIBRE'],
      [2, 1, 'A-102', 'Piso 1', 'CARRO', 'LIBRE'],
      [3, 1, 'A-103', 'Piso 1', 'CARRO', 'LIBRE'],
      [4, 1, 'A-104', 'Piso 1', 'MOTO', 'LIBRE'],
      [5, 1, 'A-105', 'Piso 1', 'CARRO', 'LIBRE'],
      [6, 1, 'B-201', 'Piso 2', 'CARRO', 'LIBRE'],
      [7, 1, 'B-202', 'Piso 2', 'MOTO', 'LIBRE'],
      [8, 1, 'B-203', 'Piso 2', 'CARRO', 'LIBRE'],
      [9, 1, 'B-204', 'Piso 2', 'MOTO', 'LIBRE'],
      [10, 1, 'B-205', 'Piso 2', 'CARRO', 'LIBRE']
    ];

    for (const cupo of cupos) {
      await pool.query(`
        INSERT INTO cupo_parqueo (id_cupo, id_sede, codigo_espacio, piso_nivel, tipo_cupo, estado_disponibilidad)
        SELECT $1, $2, $3, $4, $5, $6
        WHERE NOT EXISTS (SELECT 1 FROM cupo_parqueo WHERE id_cupo = $1)
      `, cupo);
    }

    await pool.query(`
      UPDATE cupo_parqueo
      SET estado_disponibilidad = 'LIBRE'
      WHERE estado_disponibilidad IN ('LIBRE', 'DISPONIBLE');
    `);

    console.log('✅ Base de datos PARKGO verificada y corregida automáticamente.');
  } catch (error) {
    console.warn('⚠️ No fue posible corregir automáticamente la base de datos:', error.message);
  }
};

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 6000,
    idleTimeoutMillis: 30000,
    max: 5
  });

  pool.on('error', () => {
    useMock = true;
  });

  const checkConnection = async () => {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 7000));
      await Promise.race([pool.query('SELECT 1'), timeout]);
      useMock = false;
      console.log('✅ Base de Datos PostgreSQL Neon conectada correctamente.');
      await ensureDatabaseHealth();
    } catch (err) {
      console.warn('⚠️ Base de Datos PostgreSQL remota inaccesible. Activando modo local en memoria.');
      useMock = true;
    }
  };
  checkConnection();
} else {
  useMock = true;
}

// Almacén en memoria de respaldo si PostgreSQL no responde

const salt = bcrypt.genSaltSync(10);
const passwordGuardaHash = bcrypt.hashSync('123456', salt);
const passwordEmpleadoHash = bcrypt.hashSync('123456', salt);

const mockStore = {
  usuarios: [
    {
      id_usuario: 1,
      correo_corporativo: 'guarda@parkgo.com',
      password: passwordGuardaHash,
      nombres: 'Carlos',
      apellidos: 'Rodríguez',
      cargo: 'Guarda de Seguridad',
      rol_sistema: 'GUARDA',
      estado_usuario: true,
      id_empresa: 1,
      id_sede: 1,
      id_area: 1,
      razon_social: 'PARKGO Corp',
      nombre_sede: 'Sede Principal Calle 100',
      nombre_area: 'Seguridad y Control'
    },
    {
      id_usuario: 2,
      correo_corporativo: 'empleado@parkgo.com',
      password: passwordEmpleadoHash,
      nombres: 'María',
      apellidos: 'Gómez',
      cargo: 'Ingeniera de Software',
      rol_sistema: 'EMPLEADO',
      estado_usuario: true,
      id_empresa: 1,
      id_sede: 1,
      id_area: 2,
      razon_social: 'PARKGO Corp',
      nombre_sede: 'Sede Principal Calle 100',
      nombre_area: 'Tecnología'
    }
  ],
  cupos: [
    { id_cupo: 101, codigo_espacio: 'A-101', tipo_cupo: 'CARRO', estado_disponibilidad: 'OCUPADO',    piso_nivel: 'Piso 1' },
    { id_cupo: 102, codigo_espacio: 'A-102', tipo_cupo: 'CARRO', estado_disponibilidad: 'RESERVADO',  piso_nivel: 'Piso 1' },
    { id_cupo: 103, codigo_espacio: 'A-103', tipo_cupo: 'MOTO',  estado_disponibilidad: 'DISPONIBLE', piso_nivel: 'Piso 1' },
    { id_cupo: 104, codigo_espacio: 'A-104', tipo_cupo: 'CARRO', estado_disponibilidad: 'DISPONIBLE', piso_nivel: 'Piso 1' },
    { id_cupo: 105, codigo_espacio: 'A-105', tipo_cupo: 'MOTO',  estado_disponibilidad: 'DISPONIBLE', piso_nivel: 'Piso 1' },
    { id_cupo: 106, codigo_espacio: 'B-201', tipo_cupo: 'CARRO', estado_disponibilidad: 'RESERVADO',  piso_nivel: 'Piso 2' },
    { id_cupo: 107, codigo_espacio: 'B-202', tipo_cupo: 'CARRO', estado_disponibilidad: 'DISPONIBLE', piso_nivel: 'Piso 2' },
    { id_cupo: 108, codigo_espacio: 'B-203', tipo_cupo: 'MOTO',  estado_disponibilidad: 'DISPONIBLE', piso_nivel: 'Piso 2' },
    { id_cupo: 109, codigo_espacio: 'B-204', tipo_cupo: 'CARRO', estado_disponibilidad: 'DISPONIBLE', piso_nivel: 'Piso 2' },
    { id_cupo: 110, codigo_espacio: 'B-205', tipo_cupo: 'MOTO',  estado_disponibilidad: 'DISPONIBLE', piso_nivel: 'Piso 2' }
  ],
  vehiculos: [
    { id_vehiculo: 1, id_usuario: 2, placa: 'KTM-300', tipo_vehiculo: 'MOTO', marca: 'KTM', modelo: 'Duke 390', color: 'Naranja/Negro' },
    { id_vehiculo: 2, id_usuario: 2, placa: 'ABC-123', tipo_vehiculo: 'CARRO', marca: 'Mazda', modelo: 'Mazda 3', color: 'Blanco' }
  ],
  reservas: [
    {
      id_reserva: 1,
      codigo_alfanumerico: 'PARK-8892',
      id_cupo: 101,
      id_vehiculo: 1,
      id_usuario: 2,
      estado_reserva: 'EN_SITIO',
      fecha_reserva: new Date().toISOString().split('T')[0],
      hora_entrada_estimada: '08:00',
      hora_salida_estimada: '18:00'
    },
    {
      id_reserva: 2,
      codigo_alfanumerico: 'PARK-9012',
      id_cupo: 102,
      id_vehiculo: 2,
      id_usuario: 2,
      estado_reserva: 'ACTIVA',
      fecha_reserva: new Date().toISOString().split('T')[0],
      hora_entrada_estimada: '09:30',
      hora_salida_estimada: '17:30'
    }
  ],
  registros_acceso: [
    {
      id_registro: 1,
      id_reserva: 1,
      id_usuario: 2,
      hora_entrada: new Date(Date.now() - 3600000 * 2).toISOString(),
      hora_salida: null
    }
  ]
};

const executeQuery = async (text, params = []) => {
  if (!useMock && pool) {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Query Timeout')), 4000));
      const res = await Promise.race([pool.query(text, params), timeout]);
      return res;
    } catch (err) {
      console.warn('\u26a0\ufe0f Query fall\u00f3 o timeout, usando mock:', err.message);
      useMock = true;
    }
  }

  const queryUpper = text.toUpperCase();

  // 1. Validar pase por código alfanumérico (Prioridad alta)
  if (queryUpper.includes('CODIGO_ALFANUMERICO =') || queryUpper.includes('CODIGO_ALFANUMERICO=')) {
    const codigo = params[0];
    const res = mockStore.reservas.find(r => r.codigo_alfanumerico === codigo);
    if (!res) return { rows: [] };

    const cupo = mockStore.cupos.find(c => c.id_cupo === res.id_cupo) || {};
    const vehiculo = mockStore.vehiculos.find(v => v.id_vehiculo === res.id_vehiculo) || {};
    const usuario = mockStore.usuarios.find(u => u.id_usuario === res.id_usuario) || {};

    return {
      rows: [{
        id_reserva: res.id_reserva,
        id_cupo: res.id_cupo,
        id_usuario: res.id_usuario,
        codigo_alfanumerico: res.codigo_alfanumerico,
        estado_reserva: res.estado_reserva,
        codigo_espacio: cupo.codigo_espacio || 'A-101',
        placa: vehiculo.placa || 'KTM-300',
        tipo_vehiculo: vehiculo.tipo_vehiculo || 'MOTO',
        marca: vehiculo.marca || 'KTM',
        modelo: vehiculo.modelo || 'Duke 390',
        nombre_usuario: `${usuario.nombres || 'María'} ${usuario.apellidos || 'Gómez'}`,
        correo_corporativo: usuario.correo_corporativo || 'empleado@parkgo.com'
      }]
    };
  }

  // 2. Insertar nuevo usuario (registro de cuenta)
  if (queryUpper.includes('INSERT INTO USUARIO')) {
    const nuevoId = mockStore.usuarios.length + 1;
    const nuevoUsuario = {
      id_usuario: nuevoId,
      correo_corporativo: params[0],
      password: params[1],
      nombres: params[2],
      apellidos: params[3],
      cargo: params[4] || 'Empleado',
      rol_sistema: 'EMPLEADO',
      estado_usuario: true,
      id_empresa: 1,
      id_sede: 1,
      id_area: 2,
      razon_social: 'PARKGO Corp',
      nombre_sede: 'Sede Principal Calle 100',
      nombre_area: 'General'
    };
    mockStore.usuarios.push(nuevoUsuario);
    return { rows: [nuevoUsuario], rowCount: 1 };
  }

  // 3. Búsqueda de usuario para login (por correo corporativo)
  if (queryUpper.includes('FROM USUARIO U') || queryUpper.includes('WHERE LOWER(U.CORREO_CORPORATIVO)')) {
    const email = params[0];
    if (email) {
      const user = mockStore.usuarios.find(u => u.correo_corporativo.toLowerCase() === String(email).toLowerCase());
      return { rows: user ? [user] : [] };
    }
  }

  // 3. Catálogo de parqueadero
  if (queryUpper.includes('CATALOGO') || queryUpper.includes('FROM CUPO_PARQUEO')) {
    const list = mockStore.cupos.map(cupo => {
      const reserva = mockStore.reservas.find(r => r.id_cupo === cupo.id_cupo && r.estado_reserva !== 'FINALIZADA');
      const vehiculo = reserva ? mockStore.vehiculos.find(v => v.id_vehiculo === reserva.id_vehiculo) : null;
      const usuario = reserva ? mockStore.usuarios.find(u => u.id_usuario === reserva.id_usuario) : null;
      return {
        id_cupo: cupo.id_cupo,
        codigo_espacio: cupo.codigo_espacio,
        tipo_cupo: cupo.tipo_cupo,
        estado_cupo: cupo.estado_cupo,
        piso: cupo.piso,
        codigo_pase: reserva ? reserva.codigo_alfanumerico : null,
        estado_reserva: reserva ? reserva.estado_reserva : null,
        placa: vehiculo ? vehiculo.placa : null,
        vehiculo_info: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : null,
        nombre_usuario: usuario ? `${usuario.nombres} ${usuario.apellidos}` : null
      };
    });
    return { rows: list };
  }

  // 4. Update estado_reserva
  if (queryUpper.includes('UPDATE RESERVA')) {
    const nuevoEstado = params[0];
    const idReserva = params[1];
    const res = mockStore.reservas.find(r => r.id_reserva == idReserva);
    if (res) res.estado_reserva = nuevoEstado;
    return { rowCount: 1 };
  }

  // 5. Update estado_cupo
  if (queryUpper.includes('UPDATE CUPO_PARQUEO')) {
    const nuevoEstado = params[0];
    const idCupo = params[1];
    const cupo = mockStore.cupos.find(c => c.id_cupo == idCupo);
    if (cupo) cupo.estado_cupo = nuevoEstado;
    return { rowCount: 1 };
  }

  // 6. Insert registro_acceso
  if (queryUpper.includes('INSERT INTO REGISTRO_ACCESO')) {
    const idReserva = params[0];
    const idUsuario = params[1] || 2;
    mockStore.registros_acceso.push({
      id_registro: mockStore.registros_acceso.length + 1,
      id_reserva: idReserva,
      id_usuario: idUsuario,
      hora_entrada: new Date().toISOString(),
      hora_salida: null
    });
    return { rowCount: 1 };
  }

  // 7. Update registro_acceso salida
  if (queryUpper.includes('UPDATE REGISTRO_ACCESO')) {
    const idReserva = params[0];
    const reg = mockStore.registros_acceso.find(r => r.id_reserva == idReserva && !r.hora_salida);
    if (reg) reg.hora_salida = new Date().toISOString();
    return { rowCount: 1 };
  }

  return { rows: [] };
};

module.exports = {
  query: executeQuery,
  getMockStore: () => mockStore
};