const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const { afterEach, beforeEach, mock, test } = require('node:test');

const { pool } = require('../src/db');
const roomsRouter = require('../src/routes/rooms');

const SECRET = 'test-secret-for-pbi12';
const schedule = [
  {
    day: 'lunes',
    start_time: '07:00',
    end_time: '09:00',
    subject: 'Cálculo I',
    teacher: 'Prof. García',
  },
];
const originalSecret = process.env.JWT_SECRET;

function adminToken(role = 'admin') {
  return jwt.sign({ sub: 'admin', role }, SECRET, { expiresIn: '1h' });
}

function createClient({ roomExists = true, failAt = '' } = {}) {
  const queries = [];
  let released = false;
  return {
    queries,
    wasReleased: () => released,
    async query(text, params) {
      queries.push({ text, params });
      if (failAt && text.includes(failAt)) throw new Error('detalle sensible de la base');
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rowCount: 0, rows: [] };
      if (text.includes('FOR UPDATE')) return { rowCount: roomExists ? 1 : 0, rows: roomExists ? [{ id: 1 }] : [] };
      if (text.startsWith('DELETE FROM schedules')) return { rowCount: 3, rows: [] };
      if (text.startsWith('INSERT INTO schedules')) return { rowCount: params.length / 6, rows: [] };
      throw new Error(`Consulta inesperada: ${text}`);
    },
    release() {
      released = true;
    },
  };
}

async function request(client, { token, body = { schedule }, path = '/api/rooms/1/schedule' } = {}) {
  const connectMock = mock.method(pool, 'connect', async () => client);
  const app = express();
  app.use(express.json());
  app.use('/api/rooms', roomsRouter);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token !== undefined) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: await response.json(),
      connectMock,
    };
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    mock.restoreAll();
  }
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  mock.restoreAll();
});

test('actualiza el horario en una transacción y responde updated true', async () => {
  const client = createClient();
  const result = await request(client, { token: adminToken() });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { updated: true });
  const sql = client.queries.map(query => query.text);
  assert.ok(sql.includes('BEGIN'));
  assert.ok(sql.some(text => text.includes('SELECT id FROM rooms WHERE id = $1 FOR UPDATE')));
  assert.ok(sql.some(text => text.startsWith('DELETE FROM schedules WHERE room_id = $1')));
  assert.ok(sql.some(text => text.startsWith('INSERT INTO schedules')));
  assert.ok(sql.includes('COMMIT'));
  assert.equal(sql.includes('ROLLBACK'), false);
  assert.equal(client.wasReleased(), true);

  const insert = client.queries.find(query => query.text.startsWith('INSERT INTO schedules'));
  assert.deepEqual(insert.params, [1, 'lunes', '07:00', '09:00', 'Cálculo I', 'Prof. García']);
});

test('rechaza el PUT sin token y no abre conexión', async () => {
  const client = createClient();
  const result = await request(client);

  assert.equal(result.status, 401);
  assert.match(result.body.error, /Authorization Bearer/);
  assert.equal(result.connectMock.mock.callCount(), 0);
});

test('rechaza un token inválido', async () => {
  const client = createClient();
  const result = await request(client, { token: 'token-invalido' });

  assert.equal(result.status, 401);
  assert.match(result.body.error, /Token inválido/);
  assert.equal(result.connectMock.mock.callCount(), 0);
});

test('rechaza un token sin rol de administrador', async () => {
  const client = createClient();
  const result = await request(client, { token: adminToken('user') });

  assert.equal(result.status, 403);
  assert.match(result.body.error, /rol de administrador/);
  assert.equal(result.connectMock.mock.callCount(), 0);
});

test('responde 503 cuando JWT_SECRET no está configurado', async () => {
  delete process.env.JWT_SECRET;
  const client = createClient();
  const result = await request(client, { token: adminToken() });

  assert.equal(result.status, 503);
  assert.match(result.body.error, /no está configurada/);
  assert.equal(result.connectMock.mock.callCount(), 0);
});

test('rechaza un id de salón inválido sin consultar la base', async () => {
  const client = createClient();
  const result = await request(client, { token: adminToken(), path: '/api/rooms/abc/schedule' });

  assert.equal(result.status, 400);
  assert.match(result.body.error, /entero positivo/);
  assert.equal(result.connectMock.mock.callCount(), 0);
});

test('rechaza horas invertidas sin consultar la base', async () => {
  const client = createClient();
  const result = await request(client, {
    token: adminToken(),
    body: { schedule: [{ ...schedule[0], start_time: '09:00', end_time: '07:00' }] },
  });

  assert.equal(result.status, 400);
  assert.match(result.body.error, /posterior a la inicial/);
  assert.equal(result.connectMock.mock.callCount(), 0);
});

test('devuelve 404 y hace rollback cuando el salón no existe', async () => {
  const client = createClient({ roomExists: false });
  const result = await request(client, { token: adminToken() });

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, { error: 'Salón no encontrado' });
  assert.ok(client.queries.some(query => query.text === 'ROLLBACK'));
  assert.equal(client.queries.some(query => query.text.startsWith('DELETE FROM schedules')), false);
  assert.equal(client.wasReleased(), true);
});

test('hace rollback y oculta detalles cuando falla la actualización', async () => {
  const client = createClient({ failAt: 'INSERT INTO schedules' });
  const log = mock.method(console, 'error', () => {});
  try {
    const result = await request(client, { token: adminToken() });
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { error: 'No se pudo actualizar el horario' });
  } finally {
    log.mock.restore();
  }

  assert.ok(client.queries.some(query => query.text === 'ROLLBACK'));
  assert.equal(client.queries.some(query => query.text === 'COMMIT'), false);
  assert.equal(client.wasReleased(), true);
});

test('permite vaciar el horario sin ejecutar INSERT', async () => {
  const client = createClient();
  const result = await request(client, { token: adminToken(), body: { schedule: [] } });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { updated: true });
  assert.ok(client.queries.some(query => query.text.startsWith('DELETE FROM schedules')));
  assert.equal(client.queries.some(query => query.text.startsWith('INSERT INTO schedules')), false);
  assert.ok(client.queries.some(query => query.text === 'COMMIT'));
});
