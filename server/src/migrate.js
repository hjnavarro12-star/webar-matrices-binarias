const { migrationPool } = require('./db');

const MIGRATION_ID = '001_pattern_markers';
const ADVISORY_LOCK_ID = 7342201;
const SALONES = [
  '101', '102', '103', '104', '105',
  '201', '202', '203', '204', '205',
  '301', '302', '303', '304', '305',
];

function buildSeedQuery() {
  const values = SALONES.flatMap(salon => [`pattern-${salon}`, `Salón ${salon}`, 'Bloque A']);
  const placeholders = SALONES.map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`).join(', ');
  return {
    text: `INSERT INTO rooms (pattern_marker_id, name, block)
           VALUES ${placeholders}
           ON CONFLICT (pattern_marker_id) DO UPDATE
           SET name = EXCLUDED.name`,
    values,
  };
}

async function verifySchema(client) {
  const summary = await client.query(`
    SELECT
      COUNT(*)::int AS total_rooms,
      COUNT(pattern_marker_id)::int AS rooms_with_pattern,
      COUNT(DISTINCT pattern_marker_id)::int AS unique_patterns,
      COUNT(*) FILTER (WHERE pattern_marker_id IS NULL)::int AS missing_patterns
    FROM rooms
  `);
  const sample = await client.query(`
    SELECT pattern_marker_id, name
    FROM rooms
    WHERE pattern_marker_id LIKE 'pattern-%'
    ORDER BY pattern_marker_id
    LIMIT 3
  `);
  return { summary: summary.rows[0], sample: sample.rows };
}

async function migrate(dbPool = migrationPool) {
  let client;
  let locked = false;
  try {
    client = await dbPool.connect();
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID]);
    locked = true;
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = await client.query('SELECT id FROM schema_migrations WHERE id = $1', [MIGRATION_ID]);
    if (applied.rowCount > 0) {
      await client.query('COMMIT');
      const verification = await verifySchema(client);
      console.log('[migrate] La migración ya estaba aplicada.');
      console.log(JSON.stringify(verification, null, 2));
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        pattern_marker_id VARCHAR(20) UNIQUE,
        barcode_value INTEGER UNIQUE,
        block VARCHAR(100),
        capacity INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS pattern_marker_id VARCHAR(20)');
    await client.query('ALTER TABLE rooms ALTER COLUMN barcode_value DROP NOT NULL');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS rooms_pattern_marker_id_key
      ON rooms (pattern_marker_id)
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        day VARCHAR(20) NOT NULL CHECK (day IN ('lunes','martes','miercoles','jueves','viernes','sabado')),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        subject VARCHAR(200),
        teacher VARCHAR(200),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const seed = buildSeedQuery();
    await client.query(seed.text, seed.values);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM rooms WHERE pattern_marker_id IS NULL) THEN
          ALTER TABLE rooms ALTER COLUMN pattern_marker_id SET NOT NULL;
        END IF;
      END
      $$
    `);
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [MIGRATION_ID]);
    await client.query('COMMIT');

    const verification = await verifySchema(client);
    console.log('[migrate] Migración Pattern completada.');
    console.log(JSON.stringify(verification, null, 2));
    if (verification.summary.missing_patterns > 0) {
      console.warn('[migrate] Existen salones legacy sin pattern_marker_id; no se aplicó NOT NULL.');
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (client) {
      if (locked) await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]).catch(() => {});
      client.release();
    }
    await dbPool.end();
  }
}

if (require.main === module) {
  migrate().catch(error => {
    console.error('[migrate] Error:', error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  MIGRATION_ID,
  SALONES,
  buildSeedQuery,
  migrate,
  verifySchema,
};
