const express = require('express');

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

router.put('/:id/schedule', async (req, res) => {
  res.status(501).json({ error: 'No implementado aún — pendiente RA-PBI-12' });
});

module.exports = router;
