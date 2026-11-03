/**
 * WebAR: matrices binarias
 * Rutas: /api/rooms
 *
 * RA-PBI-08: GET  /api/rooms/:barcode/schedule
 * RA-PBI-12: PUT  /api/rooms/:id/schedule
 */

const express = require('express');
const router = express.Router();
// const db = require('../db'); // TODO: configurar en RA-PBI-07

/**
 * GET /api/rooms/:barcode/schedule
 * Retorna el horario semanal del salón con ese valor de barcode.
 * Usado por ArService cuando AR.js detecta un marcador.
 */
router.get('/:barcode/schedule', async (req, res) => {
  const barcodeValue = parseInt(req.params.barcode, 10);

  if (isNaN(barcodeValue) || barcodeValue < 1 || barcodeValue > 64) {
    return res.status(400).json({ error: 'Valor de barcode inválido (debe ser 1–64)' });
  }

  // TODO (RA-PBI-08): implementar consulta real a PostgreSQL
  // const result = await db.query(
  //   `SELECT r.id, r.name, r.barcode_value, r.block,
  //           s.day, s.start_time, s.end_time, s.subject, s.teacher
  //    FROM rooms r
  //    JOIN schedules s ON s.room_id = r.id
  //    WHERE r.barcode_value = $1
  //    ORDER BY s.day, s.start_time`,
  //   [barcodeValue]
  // );

  // Datos mock para desarrollo (Sprint RA-1)
  const mockData = {
    room: {
      id: barcodeValue,
      name: `Salón ${barcodeValue}`,
      barcode_value: barcodeValue,
      block: 'Bloque Demo',
    },
    schedule: [
      { day: 'lunes',    start_time: '07:00', end_time: '09:00', subject: 'Cálculo I',        teacher: 'Por definir' },
      { day: 'miercoles', start_time: '09:00', end_time: '11:00', subject: 'Programación I', teacher: 'Por definir' },
      { day: 'viernes',  start_time: '14:00', end_time: '16:00', subject: 'Física I',         teacher: 'Por definir' },
    ],
  };

  res.json(mockData);
});

/**
 * PUT /api/rooms/:id/schedule
 * Actualiza el horario de un salón (protegido con JWT en producción).
 * RA-PBI-12
 */
router.put('/:id/schedule', async (req, res) => {
  // TODO (RA-PBI-12): validar JWT de administrador + actualizar en BD
  res.status(501).json({ error: 'No implementado aún — pendiente Sprint RA-2' });
});

module.exports = router;
