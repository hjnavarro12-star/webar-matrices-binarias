const express = require('express');
const jwt = require('jsonwebtoken');

const { pool } = require('../db');

const router = express.Router();

function resolveMarkerId(value) {
  if (/^pattern-\d{3}$/.test(value)) {
    return { column: 'pattern_marker_id', value };
  }

  const barcodeValue = Number(value);
  if (Number.isInteger(barcodeValue) && barcodeValue >= 1 && barcodeValue <= 64) {
    return { column: 'barcode_value', value: barcodeValue };
  }

  return null;
}

function mapRoomSchedule(rows) {
  const first = rows[0];
  const room = {
    id: first.id,
    name: first.name,
    pattern_marker_id: first.pattern_marker_id,
    barcode_value: first.barcode_value,
    block: first.block,
    capacity: first.capacity,
  };
  const schedule = first.schedule_id === null
    ? []
    : rows.map(row => ({
        day: row.day,
        start_time: row.start_time,
        end_time: row.end_time,
        subject: row.subject,
        teacher: row.teacher,
      }));

  return { room, schedule };
}

const VALID_DAYS = new Set(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function requireAdmin(req, res, next) {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    return res.status(503).json({ error: 'La administración no está configurada.' });
  }

  const authorization = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!authorization) {
    return res.status(401).json({ error: 'Authorization Bearer requerido.' });
  }

  try {
    const payload = jwt.verify(authorization[1], secret);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Se requiere rol de administrador.' });
    }
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

function parseRoomId(value) {
  if (!/^\d+$/.test(value)) return null;
  const roomId = Number(value);
  if (!Number.isInteger(roomId) || roomId < 1 || roomId > 2147483647) {
    return null;
  }
  return roomId;
}

function validateSchedule(body) {
  if (!body || !Array.isArray(body.schedule)) {
    return { error: 'El cuerpo debe incluir un arreglo schedule.' };
  }
  if (body.schedule.length > 100) {
    return { error: 'El horario no puede superar 100 registros.' };
  }

  const schedule = [];
  for (const [index, entry] of body.schedule.entries()) {
    if (!entry || typeof entry !== 'object') {
      return { error: `El registro ${index + 1} no es válido.` };
    }
    if (!VALID_DAYS.has(entry.day)) {
      return { error: `El día del registro ${index + 1} no es válido.` };
    }
    if (typeof entry.start_time !== 'string' || !TIME_PATTERN.test(entry.start_time)) {
      return { error: `La hora inicial del registro ${index + 1} no es válida.` };
    }
    if (typeof entry.end_time !== 'string' || !TIME_PATTERN.test(entry.end_time)) {
      return { error: `La hora final del registro ${index + 1} no es válida.` };
    }
    if (entry.start_time >= entry.end_time) {
      return { error: `La hora final debe ser posterior a la inicial en el registro ${index + 1}.` };
    }
    if (typeof entry.subject !== 'string' || !entry.subject.trim() || entry.subject.trim().length > 200) {
      return { error: `La materia del registro ${index + 1} no es válida.` };
    }
    if (typeof entry.teacher !== 'string' || !entry.teacher.trim() || entry.teacher.trim().length > 200) {
      return { error: `El docente del registro ${index + 1} no es válido.` };
    }

    schedule.push({
      day: entry.day,
      start_time: entry.start_time,
      end_time: entry.end_time,
      subject: entry.subject.trim(),
      teacher: entry.teacher.trim(),
    });
  }

  return { schedule };
}

function buildScheduleInsert(roomId, schedule) {
  const values = schedule.flatMap(entry => [
    roomId,
    entry.day,
    entry.start_time,
    entry.end_time,
    entry.subject,
    entry.teacher,
  ]);
  const placeholders = schedule.map((_, index) => {
    const offset = index * 6;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
  }).join(', ');

  return {
    text: `INSERT INTO schedules (room_id, day, start_time, end_time, subject, teacher)
           VALUES ${placeholders}`,
    values,
  };
}

router.get('/:marker_id/schedule', async (req, res) => {
  const marker = resolveMarkerId(req.params.marker_id);
  if (!marker) {
    return res.status(400).json({
      error: 'Identificador inválido. Usa pattern-101 o un barcode legacy entre 1 y 64.',
    });
  }

  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.name,
        r.pattern_marker_id,
        r.barcode_value,
        r.block,
        r.capacity,
        s.id AS schedule_id,
        s.day,
        to_char(s.start_time, 'HH24:MI') AS start_time,
        to_char(s.end_time, 'HH24:MI') AS end_time,
        s.subject,
        s.teacher
      FROM rooms r
      LEFT JOIN schedules s ON s.room_id = r.id
      WHERE r.${marker.column} = $1
      ORDER BY CASE s.day
        WHEN 'lunes' THEN 1
        WHEN 'martes' THEN 2
        WHEN 'miercoles' THEN 3
        WHEN 'jueves' THEN 4
        WHEN 'viernes' THEN 5
        WHEN 'sabado' THEN 6
      END, s.start_time
    `, [marker.value]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Salón no encontrado' });
    }

    res.set('Cache-Control', 'no-store');
    return res.json(mapRoomSchedule(result.rows));
  } catch (error) {
    console.error('[rooms] Error al consultar el horario:', error.message);
    return res.status(500).json({ error: 'No se pudo consultar el horario' });
  }
});

router.put('/:id/schedule', requireAdmin, async (req, res) => {
  const roomId = parseRoomId(req.params.id);
  if (!roomId) {
    return res.status(400).json({ error: 'El id del salón debe ser un entero positivo.' });
  }

  const validation = validateSchedule(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const room = await client.query('SELECT id FROM rooms WHERE id = $1 FOR UPDATE', [roomId]);
    if (room.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Salón no encontrado' });
    }

    await client.query('DELETE FROM schedules WHERE room_id = $1', [roomId]);
    if (validation.schedule.length > 0) {
      const insert = buildScheduleInsert(roomId, validation.schedule);
      await client.query(insert.text, insert.values);
    }
    await client.query('COMMIT');

    res.set('Cache-Control', 'no-store');
    return res.json({ updated: true });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('[rooms] Error al actualizar el horario:', error.message);
    return res.status(500).json({ error: 'No se pudo actualizar el horario' });
  } finally {
    client?.release();
  }
});

module.exports = router;
