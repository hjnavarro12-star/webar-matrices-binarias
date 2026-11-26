const assert = require('node:assert/strict');
const { mock, test } = require('node:test');

const {
  ADVISORY_LOCK_ID,
  SALONES,
  SCHEDULE_SEED,
  buildScheduleSeedQuery,
  seedRooms,
  verifyScheduleSeed,
} = require('../src/seed-rooms');

function roomCounts() {
  return SALONES.map(salon => ({
    pattern_marker_id: `pattern-${salon}`,
    schedule_count: 3,
    subject_count: 3,
  }));
}

function createPoolDouble(inserted = 45) {
  const queries = [];
  let released = false;
  let ended = false;
  const client = {
    async query(text, params) {
      queries.push({ text, params });
      if (text.includes('COUNT(s.id)::int AS total_schedules')) {
        return { rows: [{ total_schedules: 45, rooms_with_schedules: 15 }] };
      }
      if (text.includes('schedule_count')) {
        return { rows: roomCounts() };
      }
      if (text.includes('INSERT INTO schedules')) {
        return { rowCount: inserted };
      }
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

test('define tres horarios y tres materias distintas para cada salón', () => {
  assert.equal(SCHEDULE_SEED.length, 45);
  assert.equal(new Set(SCHEDULE_SEED.map(entry => entry.pattern_marker_id)).size, 15);

  for (const salon of SALONES) {
    const entries = SCHEDULE_SEED.filter(entry => entry.pattern_marker_id === `pattern-${salon}`);
    assert.equal(entries.length, 3);
    assert.equal(new Set(entries.map(entry => entry.subject)).size, 3);
    assert.deepEqual(entries.map(entry => entry.day), ['lunes', 'miercoles', 'viernes']);
    for (const entry of entries) {
      assert.match(entry.start_time, /^\d{2}:\d{2}$/);
      assert.match(entry.end_time, /^\d{2}:\d{2}$/);
      assert.ok(entry.start_time < entry.end_time);
      assert.ok(entry.subject.length > 0);
      assert.ok(entry.teacher.length > 0);
    }
  }
});

test('construye un INSERT parametrizado que no duplica horarios existentes', () => {
  const seed = buildScheduleSeedQuery();
  assert.equal(seed.values.length, 270);
  assert.equal((seed.text.match(/\$\d+/g) || []).length, 270);
  assert.ok(seed.text.includes('$270'));
  assert.match(seed.text, /JOIN rooms r ON r\.pattern_marker_id = seed\.pattern_marker_id/);
  assert.match(seed.text, /WHERE NOT EXISTS/);
  assert.doesNotMatch(seed.text, /DELETE FROM/i);
});

test('verifica al menos 45 horarios y tres materias por cada salón', async () => {
  const client = {
    async query(text) {
      if (text.includes('COUNT(s.id)::int AS total_schedules')) {
        return { rows: [{ total_schedules: 45, rooms_with_schedules: 15 }] };
      }
      if (text.includes('schedule_count')) return { rows: roomCounts() };
      throw new Error(`Consulta inesperada: ${text}`);
    },
  };

  const result = await verifyScheduleSeed(client);
  assert.equal(result.valid, true);
  assert.deepEqual(result.summary, { total_schedules: 45, rooms_with_schedules: 15 });
  assert.deepEqual(result.missing, []);
});

test('detecta salones con menos de tres materias distintas', async () => {
  const client = {
    async query(text) {
      if (text.includes('COUNT(s.id)::int AS total_schedules')) {
        return { rows: [{ total_schedules: 45, rooms_with_schedules: 15 }] };
      }
      if (text.includes('schedule_count')) {
        return { rows: roomCounts().map((row, index) => index === 0 ? { ...row, subject_count: 2 } : row) };
      }
      throw new Error(`Consulta inesperada: ${text}`);
    },
  };

  const result = await verifyScheduleSeed(client);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['pattern-101']);
});

test('siembra dentro de una transacción y libera el advisory lock', async () => {
  const double = createPoolDouble();
  const log = mock.method(console, 'log', () => {});
  try {
    const result = await seedRooms(double.pool);
    assert.equal(result.inserted, 45);
    assert.equal(result.valid, true);
  } finally {
    log.mock.restore();
  }

  const sql = double.queries.map(query => query.text);
  assert.ok(sql.some(text => text.includes('pg_advisory_lock')));
  assert.equal(double.queries.find(query => query.text.includes('pg_advisory_lock')).params[0], ADVISORY_LOCK_ID);
  assert.ok(sql.includes('BEGIN'));
  assert.ok(sql.some(text => text.includes('INSERT INTO rooms')));
  assert.ok(sql.some(text => text.includes('INSERT INTO schedules')));
  assert.ok(sql.includes('COMMIT'));
  assert.ok(sql.some(text => text.includes('pg_advisory_unlock')));
  assert.equal(double.wasReleased(), true);
  assert.equal(double.wasEnded(), true);
});

test('acepta una segunda ejecución sin inserciones nuevas', async () => {
  const double = createPoolDouble(0);
  const log = mock.method(console, 'log', () => {});
  try {
    const result = await seedRooms(double.pool);
    assert.equal(result.inserted, 0);
    assert.equal(result.valid, true);
  } finally {
    log.mock.restore();
  }
});
