const { Pool } = require('pg');

const APP_ENV = process.env.APP_ENV || 'homolog';
const connectionString = APP_ENV === 'production'
  ? process.env.DATABASE_URL_PRODUCTION
  : process.env.DATABASE_URL_HOMOLOG;

const pool = new Pool({ connectionString });

module.exports = { pool, APP_ENV };
