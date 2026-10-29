const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const W = 800, H = 500, PW = 12, PH = 90, R = 8;
const rooms = new Map();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true }));

function newRoom(code) {
  return { code, players: [], state: { running: false, score: [0,0], y: [H/2-PH/2,H/2-PH/2], ball: {x:W/2,y:H/2,vx:0,vy:0,speed:380}, lastPoint: 0 }, lastTick: Date.now() };
}
function sendRoom(room) {
  io.to(room.code).emit('state', {
    players: room.players.map((id, i) => ({ slot: i + 1, connected: io.sockets.sockets.has(id) })),
    running: room.state.running, score: room.state.score, y: room.state.y,
    ball: room.state.ball, code: room.code
  });
}
function resetBall(room, direction) {
  const b = room.state.ball;
  b.x = W/2; b.y = H/2; b.speed = 380;
  const angle = Math.random() * 0.8 - 0.4;
  b.vx = Math.cos(angle) * b.speed * direction;
  b.vy = Math.sin(angle) * b.speed;
}
function startGame(room) {
  if (room.players.length !== 2 || room.state.running) return;
  resetBall(room, Math.random() < .5 ? 1 : -1);
  room.state.running = true;
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

io.on('connection', socket => {
  socket.on('joinRoom', (rawCode, reply) => {
    const code = String(rawCode || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    if (!code) return reply?.({ ok:false, error:'Digite um código de sala.' });
    let room = rooms.get(code);
    if (!room) { room = newRoom(code); rooms.set(code, room); }
    if (room.players.includes(socket.id)) return reply?.({ ok:true, slot: room.players.indexOf(socket.id)+1, code });
    if (room.players.length >= 2) return reply?.({ ok:false, error:'Essa sala já está cheia. Escolha outro código.' });
    room.players.push(socket.id);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.slot = room.players.length;
    reply?.({ ok:true, slot: socket.data.slot, code });
    io.to(code).emit('notice', room.players.length === 2 ? 'Os dois jogadores estão conectados! Apertem Espaço para começar.' : 'Sala criada! Envie o código ao seu amigo e aguarde.');
    sendRoom(room);
  });
  socket.on('move', y => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !socket.data.slot) return;
    const idx = socket.data.slot - 1;
    room.state.y[idx] = clamp(Number(y) || 0, 0, H - PH);
  });
  socket.on('startGame', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    if (room.players.length < 2) return socket.emit('notice', 'Ainda falta seu amigo entrar na sala.');
    startGame(room); sendRoom(room);
  });
  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    room.players = room.players.filter(id => id !== socket.id);
    room.state.running = false;
    if (room.players.length === 0) rooms.delete(code);
    else {
      const remaining = room.players[0];
      const s = io.sockets.sockets.get(remaining);
      if (s) s.data.slot = 1;
      io.to(code).emit('notice', 'Seu amigo desconectou. Compartilhe o código para ele voltar.');
      sendRoom(room);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const st = room.state, dt = Math.min((now - room.lastTick) / 1000, 0.033);
    room.lastTick = now;
    if (st.running && room.players.length === 2) {
      const b = st.ball;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); }
      if (b.y > H-R) { b.y = H-R; b.vy = -Math.abs(b.vy); }
      for (let i=0;i<2;i++) {
        const x = i===0 ? 24 : W-24-PW, y = st.y[i];
        const hit = i===0 ? (b.x-R<=x+PW && b.x>x && b.vx<0) : (b.x+R>=x && b.x<x+PW && b.vx>0);
        if (hit && b.y > y-R && b.y < y+PH+R) {
          const off = (b.y-(y+PH/2))/(PH/2);
          b.speed = Math.min(1000, b.speed*1.08);
          const angle = off*Math.PI/3.2;
          b.vx = Math.cos(angle)*b.speed*(i===0?1:-1); b.vy = Math.sin(angle)*b.speed;
          b.x = i===0 ? x+PW+R : x-R;
        }
      }
      if (b.x < -R || b.x > W+R) {
        const winner = b.x < 0 ? 1 : 0;
        st.score[winner]++;
        st.running = false;
        st.lastPoint = winner+1;
        io.to(room.code).emit('notice', `Ponto para o Jogador ${winner+1}! Apertem Espaço para continuar.`);
      }
    }
    sendRoom(room);
  }
}, 33);

server.listen(PORT, '0.0.0.0', () => console.log(`Pong Online rodando na porta ${PORT}`));
