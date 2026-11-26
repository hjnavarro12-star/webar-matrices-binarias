const { migrationPool } = require('./db');
const { SALONES, verifySchema } = require('./migrate');

async function verify() {
  let client;
  try {
    client = await migrationPool.connect();
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'rooms'
      ORDER BY ordinal_position
    `);
    const migration = await client.query(
      'SELECT id, applied_at FROM schema_migrations WHERE id = $1',
      ['001_pattern_markers'],
    );
    const result = await verifySchema(client);
    const expected = new Set(SALONES.map(salon => `pattern-${salon}`));
    const actual = await client.query(`
      SELECT pattern_marker_id
      FROM rooms
      WHERE pattern_marker_id LIKE 'pattern-%'
    `);
    const missing = SALONES.filter(salon => !actual.rows.some(row => row.pattern_marker_id === `pattern-${salon}`));
    const valid =
      migration.rowCount === 1 &&
      result.summary.rooms_with_pattern >= SALONES.length &&
      result.summary.unique_patterns === result.summary.rooms_with_pattern &&
      missing.length === 0;

    console.log(JSON.stringify({
      valid,
      migration: migration.rows[0] || null,
      columns: columns.rows,
      ...result,
      missing,
      expectedCount: expected.size,
    }, null, 2));
    if (!valid) process.exitCode = 1;
  } finally {
    client?.release();
    await migrationPool.end();
  }
}

verify().catch(error => {
  console.error('[verify] Error:', error.message);
  process.exitCode = 1;
});
