const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const MAX_LEN = 500;
let waiting = null; // one person waiting for a match

function unpair(socket, notify) {
  if (waiting === socket) waiting = null;
  const partnerId = socket.data.partner;
  socket.data.partner = null;
  if (partnerId) {
    const partner = io.sockets.sockets.get(partnerId);
    if (partner) {
      partner.data.partner = null;
      if (notify) partner.emit('partner-left');
    }
  }
}

function findMatch(socket) {
  unpair(socket, true);
  if (waiting && waiting !== socket && waiting.connected) {
    const other = waiting;
    waiting = null;
    socket.data.partner = other.id;
    other.data.partner = socket.id;
    socket.emit('matched');
    other.emit('matched');
  } else {
    waiting = socket;
    socket.emit('waiting');
  }
}

io.on('connection', (socket) => {
  socket.data.partner = null;
  socket.data.last = 0;
  io.emit('online', io.engine.clientsCount);

  socket.on('find', () => findMatch(socket));

  socket.on('message', (text) => {
    if (typeof text !== 'string') return;
    const now = Date.now();
    if (now - socket.data.last < 300) return; // slow down spam
    socket.data.last = now;
    const clean = text.trim().slice(0, MAX_LEN);
    if (!clean) return;
    const partner = io.sockets.sockets.get(socket.data.partner);
    if (partner) partner.emit('message', clean);
  });

  socket.on('typing', (isTyping) => {
    const partner = io.sockets.sockets.get(socket.data.partner);
    if (partner) partner.emit('typing', !!isTyping);
  });

  socket.on('leave', () => unpair(socket, true));

  socket.on('report', () => {
    console.log('Report from', socket.id, 'about', socket.data.partner);
    unpair(socket, true);
  });

  socket.on('disconnect', () => {
    unpair(socket, true);
    io.emit('online', io.engine.clientsCount);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('jk running on port ' + PORT));
