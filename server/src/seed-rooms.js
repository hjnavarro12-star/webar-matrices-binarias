const { migrationPool } = require('./db');
const { SALONES, buildSeedQuery } = require('./migrate');

const ADVISORY_LOCK_ID = 7342202;
const SUBJECTS = [
  { subject: 'Cálculo I', teacher: 'Prof. García' },
  { subject: 'Física II', teacher: 'Prof. Martínez' },
  { subject: 'Programación I', teacher: 'Prof. Rodríguez' },
  { subject: 'Álgebra Lineal', teacher: 'Prof. López' },
  { subject: 'Bases de Datos', teacher: 'Prof. Ramírez' },
  { subject: 'Inglés Técnico', teacher: 'Prof. Torres' },
];
const SLOTS = [
  { day: 'lunes', start_time: '07:00', end_time: '09:00' },
  { day: 'miercoles', start_time: '10:00', end_time: '12:00' },
  { day: 'viernes', start_time: '14:00', end_time: '16:00' },
];

const SCHEDULE_SEED = SALONES.flatMap((salon, roomIndex) =>
  SLOTS.map((slot, slotIndex) => {
    const selected = SUBJECTS[(roomIndex + slotIndex) % SUBJECTS.length];
    return {
      pattern_marker_id: `pattern-${salon}`,
      ...slot,
      ...selected,
    };
  }),
);

function buildScheduleSeedQuery() {
  const values = SCHEDULE_SEED.flatMap(entry => [
    entry.pattern_marker_id,
    entry.day,
    entry.start_time,
    entry.end_time,
    entry.subject,
    entry.teacher,
  ]);
  const placeholders = SCHEDULE_SEED.map((_, index) => {
    const offset = index * 6;
    return `($${offset + 1}::varchar, $${offset + 2}::varchar, $${offset + 3}::time, $${offset + 4}::time, $${offset + 5}::varchar, $${offset + 6}::varchar)`;
  }).join(', ');

  return {
    text: `INSERT INTO schedules (room_id, day, start_time, end_time, subject, teacher)
           SELECT r.id, seed.day, seed.start_time, seed.end_time, seed.subject, seed.teacher
           FROM (VALUES ${placeholders}) AS seed(
             pattern_marker_id, day, start_time, end_time, subject, teacher
           )
           JOIN rooms r ON r.pattern_marker_id = seed.pattern_marker_id
           WHERE NOT EXISTS (
             SELECT 1
             FROM schedules s
             WHERE s.room_id = r.id
               AND s.day = seed.day
               AND s.start_time = seed.start_time
               AND s.end_time = seed.end_time
           )`,
    values,
  };
}

async function verifyScheduleSeed(client) {
  const summaryResult = await client.query(`
    SELECT
      COUNT(s.id)::int AS total_schedules,
      COUNT(DISTINCT s.room_id)::int AS rooms_with_schedules
    FROM schedules s
    JOIN rooms r ON r.id = s.room_id
    WHERE r.pattern_marker_id LIKE 'pattern-%'
  `);
  const roomsResult = await client.query(`
    SELECT
      r.pattern_marker_id,
      COUNT(s.id)::int AS schedule_count,
      COUNT(DISTINCT s.subject)::int AS subject_count
    FROM rooms r
    LEFT JOIN schedules s ON s.room_id = r.id
    WHERE r.pattern_marker_id LIKE 'pattern-%'
    GROUP BY r.pattern_marker_id
    ORDER BY r.pattern_marker_id
  `);
  const counts = new Map(roomsResult.rows.map(row => [row.pattern_marker_id, row.subject_count]));
  const missing = SALONES
    .map(salon => `pattern-${salon}`)
    .filter(markerId => (counts.get(markerId) ?? 0) < 3);
  const summary = summaryResult.rows[0];
  const valid =
    summary.total_schedules >= SCHEDULE_SEED.length &&
    summary.rooms_with_schedules === SALONES.length &&
    roomsResult.rows.length === SALONES.length &&
    missing.length === 0;

  return { valid, summary, rooms: roomsResult.rows, missing };
}

async function seedRooms(dbPool = migrationPool) {
  let client;
  let locked = false;
  try {
    client = await dbPool.connect();
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID]);
    locked = true;
    await client.query('BEGIN');

    const roomSeed = buildSeedQuery();
    await client.query(roomSeed.text, roomSeed.values);

    const scheduleSeed = buildScheduleSeedQuery();
    const inserted = await client.query(scheduleSeed.text, scheduleSeed.values);
    await client.query('COMMIT');

    const verification = await verifyScheduleSeed(client);
    const result = { inserted: inserted.rowCount, ...verification };
    console.log(JSON.stringify(result, null, 2));
    if (!verification.valid) {
      throw new Error('El seed no alcanzó tres materias distintas para cada salón.');
    }
    return result;
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
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
  seedRooms().catch(error => {
    console.error('[seed] Error:', error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  SALONES,
  ADVISORY_LOCK_ID,
  SUBJECTS,
  SLOTS,
  SCHEDULE_SEED,
  buildScheduleSeedQuery,
  verifyScheduleSeed,
  seedRooms,
};
