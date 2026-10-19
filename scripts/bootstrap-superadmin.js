require('dotenv').config();

const { Pool } = require('pg');

const email = String(process.argv[2] || '').trim().toLowerCase();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailPattern.test(email)) {
  console.error('Uso: npm run bootstrap:admin -- correo@organizacion.edu');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL debe estar configurada en el entorno.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  max: 1
});

const bootstrap = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(50415201)');

    const existingAdmin = await client.query(
      `SELECT id_usuario FROM usuario
       WHERE rol_sistema = 'SUPERADMIN'
       LIMIT 1`
    );
    if (existingAdmin.rows.length > 0) {
      throw new Error('Ya existe un SUPERADMIN. Asigna los demás permisos desde el panel.');
    }

    const account = await client.query(
      `SELECT id_usuario
       FROM usuario
       WHERE LOWER(correo_corporativo) = $1
         AND estado_usuario = TRUE
       FOR UPDATE`,
      [email]
    );
    if (account.rows.length === 0) {
      throw new Error('No se encontró una cuenta activa con ese correo. Regístrala primero.');
    }

    await client.query(
      `UPDATE usuario SET rol_sistema = 'SUPERADMIN' WHERE id_usuario = $1`,
      [account.rows[0].id_usuario]
    );
    await client.query('COMMIT');
    console.log(`Cuenta ${account.rows[0].id_usuario} promovida a SUPERADMIN.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

bootstrap()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());