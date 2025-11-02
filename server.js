// npm install ws
import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
console.log("Server running on ws://localhost:8080");

let players = {};
let bullets = {};

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

wss.on('connection', ws => {
  let id = Date.now() + '_' + Math.floor(Math.random()*1000);
  console.log('Player connected', id);

  // init player
  players[id] = { id, x: Math.random()*800+50, y: Math.random()*500+50, angle:0, hp:100 };
  ws.send(JSON.stringify({ type:'init', id }));

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'update') {
        if (players[id]) {
          players[id].x = data.x;
          players[id].y = data.y;
          players[id].angle = data.angle;
        }
      }

      if (data.type === 'shoot') {
        const bulletId = id+'_'+Date.now();
        bullets[bulletId] = {
          id: bulletId,
          x: data.x,
          y: data.y,
          vx: data.vx,
          vy: data.vy,
          owner: id,
          t: Date.now()
        };
      }

    } catch(e) { console.error(e); }
  });

  ws.on('close', () => {
    console.log('Player disconnected', id);
    delete players[id];
  });
});

// main game loop: simulate bullets & broadcast state
setInterval(() => {
  const now = Date.now();
  // move bullets & remove expired
  for (const bid in bullets) {
    const b = bullets[bid];
    const age = now - b.t;
    if (age > 2000) { delete bullets[bid]; continue; }
    b.x += b.vx/60; // 60 FPS approximation
    b.y += b.vy/60;

    // simple collision vs players
    for (const pid in players) {
      if (pid === b.owner) continue;
      const p = players[pid];
      const dist = Math.hypot(p.x - b.x, p.y - b.y);
      if (dist < 16) {
        p.hp -= 10;
        if (p.hp <= 0) {
          p.hp = 100;
          p.x = Math.random()*800+50;
          p.y = Math.random()*500+50;
        }
        delete bullets[bid];
      }
    }
  }

  // broadcast state
  broadcast({ type:'state', players, bullets });

}, 1000/60); // 60 FPS
