/**
 * WebAR: matrices binarias — Backend Express
 * Servidor principal
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const roomsRouter = require('./routes/rooms');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'webar-matrices-binarias', timestamp: new Date().toISOString() });
});

// Rutas
app.use('/api/rooms', roomsRouter);

app.listen(PORT, () => {
  console.log(`[WebAR Server] Puerto ${PORT}`);
});

module.exports = app;
