// server.js
import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
console.log('WebSocket server running...');

let players = {};
let bullets = {};

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

wss.on('connection', ws => {
  const id = Date.now()+'_'+Math.floor(Math.random()*1000);
  players[id] = { id, x: Math.random()*800+50, y: Math.random()*500+50, angle:0, hp:100 };
  ws.send(JSON.stringify({ type:'init', id }));

  ws.on('message', msg => {
    const data = JSON.parse(msg);
    if(data.type === 'update' && players[id]){
      players[id].x = data.x;
      players[id].y = data.y;
      players[id].angle = data.angle;
    }
    if(data.type === 'shoot'){
      const bid = id+'_'+Date.now();
      bullets[bid] = {
        id: bid,
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        owner: id,
        t: Date.now()
      };
    }
  });

  ws.on('close', () => { delete players[id]; });
});

setInterval(() => {
  const now = Date.now();
  for(const bid in bullets){
    const b = bullets[bid];
    const age = now - b.t;
    if(age > 2000){ delete bullets[bid]; continue; }
    b.x += b.vx/60; b.y += b.vy/60;

    for(const pid in players){
      if(pid===b.owner) continue;
      const p = players[pid];
      if(Math.hypot(p.x-b.x,p.y-b.y)<16){
        p.hp -= 10;
        if(p.hp<=0){
          p.hp = 100;
          p.x = Math.random()*800+50;
          p.y = Math.random()*500+50;
        }
        delete bullets[bid];
      }
    }
  }
  broadcast({ type:'state', players, bullets });
}, 1000/60);
