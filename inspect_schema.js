const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000
});

async function main() {
  try {
    // Ver tablas existentes
    const tablas = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const esquema = {};
    tablas.rows.forEach(row => {
      if (!esquema[row.table_name]) esquema[row.table_name] = [];
      esquema[row.table_name].push(`${row.column_name} (${row.data_type})${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });

    console.log('\n=== TABLAS EN NEON DB ===');
    Object.entries(esquema).forEach(([tabla, cols]) => {
      console.log(`\n📋 ${tabla.toUpperCase()}`);
      cols.forEach(c => console.log('   - ' + c));
    });

    if (Object.keys(esquema).length === 0) {
      console.log('⚠️  No hay tablas en el esquema público. La DB está vacía.');
    }

    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

main();
