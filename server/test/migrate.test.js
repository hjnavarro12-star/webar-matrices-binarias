const assert = require('node:assert/strict');
const test = require('node:test');

const { MIGRATION_ID, SALONES, buildSeedQuery, migrate, verifySchema } = require('../src/migrate');

test('define los quince identificadores Pattern esperados', () => {
  assert.equal(MIGRATION_ID, '001_pattern_markers');
  assert.equal(SALONES.length, 15);
  assert.equal(new Set(SALONES).size, 15);
  assert.deepEqual(SALONES, [
    '101', '102', '103', '104', '105',
    '201', '202', '203', '204', '205',
    '301', '302', '303', '304', '305',
  ]);
});

test('construye un seed parametrizado e idempotente', () => {
  const seed = buildSeedQuery();
  assert.equal(seed.values.length, 45);
  assert.equal(seed.values[0], 'pattern-101');
  assert.equal(seed.values[1], 'Salón 101');
  assert.match(seed.text, /ON CONFLICT \(pattern_marker_id\) DO UPDATE/);
  assert.equal((seed.text.match(/\$\d+/g) || []).length, 45);
  assert.ok(seed.text.includes('$45'));
});

test('resume el resultado de verificación del esquema', async () => {
  const summary = {
    total_rooms: 15,
    rooms_with_pattern: 15,
    unique_patterns: 15,
    missing_patterns: 0,
  };
  const sample = [{ pattern_marker_id: 'pattern-101', name: 'Salón 101' }];
  const client = {
    async query(text) {
      if (text.includes('COUNT(*)::int AS total_rooms')) return { rows: [summary] };
      if (text.includes('LIMIT 3')) return { rows: sample };
      throw new Error(`Consulta inesperada: ${text}`);
    },
  };

  const result = await verifySchema(client);
  assert.deepEqual(result, { summary, sample });
});

function createPoolDouble(applied) {
  const queries = [];
  let released = false;
  let ended = false;
  const summary = {
    total_rooms: 15,
    rooms_with_pattern: 15,
    unique_patterns: 15,
    missing_patterns: 0,
  };
  const client = {
    async query(text, params) {
      queries.push({ text, params });
      if (text.includes('SELECT id FROM schema_migrations')) {
        return { rowCount: applied ? 1 : 0, rows: applied ? [{ id: MIGRATION_ID }] : [] };
      }
      if (text.includes('COUNT(*)::int AS total_rooms')) return { rows: [summary] };
      if (text.includes('LIMIT 3')) return { rows: [] };
      return { rowCount: 0, rows: [] };
    },
    release() {
      released = true;
    },
  };
  return {
    queries,
    pool: {
      async connect() {
        return client;
      },
      async end() {
        ended = true;
      },
    },
    wasReleased: () => released,
    wasEnded: () => ended,
  };
}

test('aplica la migración dentro de una transacción y libera el bloqueo', async () => {
  const double = createPoolDouble(false);
  await migrate(double.pool);
  const sql = double.queries.map(query => query.text);
  assert.ok(sql.some(text => text.includes('pg_advisory_lock')));
  assert.ok(sql.includes('BEGIN'));
  assert.ok(sql.includes('COMMIT'));
  assert.ok(sql.some(text => text.includes('pg_advisory_unlock')));
  assert.ok(sql.some(text => text.includes('INSERT INTO rooms')));
  assert.ok(sql.some(text => text.includes('INSERT INTO schema_migrations')));
  assert.equal(double.wasReleased(), true);
  assert.equal(double.wasEnded(), true);
});

test('no repite DDL ni seed cuando la migración ya fue aplicada', async () => {
  const double = createPoolDouble(true);
  await migrate(double.pool);
  const sql = double.queries.map(query => query.text);
  assert.equal(sql.some(text => text.includes('ALTER TABLE rooms')), false);
  assert.equal(sql.some(text => text.includes('INSERT INTO rooms')), false);
  assert.ok(sql.includes('COMMIT'));
  assert.equal(double.wasReleased(), true);
  assert.equal(double.wasEnded(), true);
});
