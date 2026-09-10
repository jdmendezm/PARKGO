const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log(' Conectado exitosamente a PostgreSQL en la Nube');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};