/**
 * WebAR: matrices binarias — Migración de base de datos
 * Ejecutar una vez: node src/migrate.js
 *
 * Idempotente: se puede correr múltiples veces sin duplicar tablas.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'webar_dev',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[migrate] Iniciando migración WebAR...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id             SERIAL PRIMARY KEY,
        name           VARCHAR(100) NOT NULL,
        barcode_value  INTEGER      UNIQUE NOT NULL,
        block          VARCHAR(100),
        capacity       INTEGER,
        created_at     TIMESTAMPTZ  DEFAULT NOW()
      );
    `);
    console.log('[migrate] ✅ Tabla rooms OK');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id          SERIAL PRIMARY KEY,
        room_id     INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        day         VARCHAR(20) NOT NULL CHECK (day IN ('lunes','martes','miercoles','jueves','viernes','sabado')),
        start_time  TIME NOT NULL,
        end_time    TIME NOT NULL,
        subject     VARCHAR(200),
        teacher     VARCHAR(200),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[migrate] ✅ Tabla schedules OK');

    console.log('[migrate] Migración completada.');
  } catch (err) {
    console.error('[migrate] ❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
