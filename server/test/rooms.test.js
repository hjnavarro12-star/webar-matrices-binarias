const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { mock, test } = require('node:test');

const { pool } = require('../src/db');
const roomsRouter = require('../src/routes/rooms');

const roomRow = {
  id: 1,
  name: 'Salón 101',
  pattern_marker_id: 'pattern-101',
  barcode_value: null,
  block: 'Bloque A',
  capacity: 30,
  schedule_id: 10,
  day: 'lunes',
  start_time: '07:00',
  end_time: '09:00',
  subject: 'Cálculo I',
  teacher: 'Prof. García',
};

async function request(path, queryImplementation) {
  const queryMock = mock.method(pool, 'query', queryImplementation);
  const app = express();
  app.use('/api/rooms', roomsRouter);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return {
      status: response.status,
      body: await response.json(),
      queryMock,
    };
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    mock.restoreAll();
  }
}

test('consulta un salón Pattern y devuelve el contrato de horario', async () => {
  const result = await request('/api/rooms/pattern-101/schedule', async () => ({
    rowCount: 1,
    rows: [roomRow],
  }));

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    room: {
      id: 1,
      name: 'Salón 101',
      pattern_marker_id: 'pattern-101',
      barcode_value: null,
      block: 'Bloque A',
      capacity: 30,
    },
    schedule: [{
      day: 'lunes',
      start_time: '07:00',
      end_time: '09:00',
      subject: 'Cálculo I',
      teacher: 'Prof. García',
    }],
  });
  assert.match(result.queryMock.mock.calls[0].arguments[0], /WHERE r\.pattern_marker_id = \$1/);
  assert.deepEqual(result.queryMock.mock.calls[0].arguments[1], ['pattern-101']);
});

test('mantiene compatibilidad con barcode legacy', async () => {
  const result = await request('/api/rooms/1/schedule', async () => ({
    rowCount: 1,
    rows: [{ ...roomRow, barcode_value: 1 }],
  }));

  assert.equal(result.status, 200);
  assert.match(result.queryMock.mock.calls[0].arguments[0], /WHERE r\.barcode_value = \$1/);
  assert.deepEqual(result.queryMock.mock.calls[0].arguments[1], [1]);
});

test('rechaza identificadores inválidos sin consultar la base', async () => {
  const result = await request('/api/rooms/abc/schedule', async () => {
    throw new Error('No debería consultar');
  });

  assert.equal(result.status, 400);
  assert.equal(result.queryMock.mock.callCount(), 0);
});

test('devuelve 404 cuando el salón no existe', async () => {
  const result = await request('/api/rooms/pattern-999/schedule', async () => ({
    rowCount: 0,
    rows: [],
  }));

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, { error: 'Salón no encontrado' });
});

test('devuelve una lista vacía cuando el salón no tiene horarios', async () => {
  const result = await request('/api/rooms/pattern-101/schedule', async () => ({
    rowCount: 1,
    rows: [{ ...roomRow, schedule_id: null }],
  }));

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.schedule, []);
});

test('oculta detalles internos cuando falla la consulta', async () => {
  const result = await request('/api/rooms/pattern-101/schedule', async () => {
    throw new Error('detalle sensible de la base');
  });

  assert.equal(result.status, 500);
  assert.deepEqual(result.body, { error: 'No se pudo consultar el horario' });
});
