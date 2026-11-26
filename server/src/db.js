const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');

const directConnectionString = process.env.DATABASE_URL?.trim();
const runtimeConnectionString = process.env.DATABASE_URL_POOLED?.trim() || directConnectionString;
const sslEnabled = runtimeConnectionString
  ? process.env.DB_SSL !== 'false'
  : process.env.DB_SSL === 'true';

function createPool(connectionString) {
  return new Pool({
    ...(connectionString
      ? { connectionString }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT || 5432),
          database: process.env.DB_NAME || 'webar_dev',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
        }),
    ssl: sslEnabled
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
  });
}

const pool = createPool(runtimeConnectionString);
const migrationPool = directConnectionString && directConnectionString !== runtimeConnectionString
  ? createPool(directConnectionString)
  : pool;

module.exports = {
  pool,
  migrationPool,
  usesConnectionString: Boolean(directConnectionString),
  usesPooledConnectionString: Boolean(process.env.DATABASE_URL_POOLED?.trim()),
};
