require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const APP_ENV = process.env.APP_ENV || 'homolog';
const connectionString = APP_ENV === 'production'
  ? process.env.DATABASE_URL_PRODUCTION
  : process.env.DATABASE_URL_HOMOLOG;

if (!connectionString) {
  console.error(`Faltando DATABASE_URL para APP_ENV=${APP_ENV}`);
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (rows.length > 0) {
      console.log(`(já aplicada) ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`Aplicando ${file}...`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      console.log(`OK: ${file}`);
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  }

  await pool.end();
}

run().catch((err) => {
  console.error('Falha ao migrar:', err);
  process.exit(1);
});
