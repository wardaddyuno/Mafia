
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/build/index.html')));

const wss = new WebSocketServer({ server, path: '/ws' });

const games = new Map();

function assignRoles(names){
  const roles = ['Mafia','Doctor','Detective', ...Array(Math.max(0, names.length-3)).fill('Villager')];
  for (let i = roles.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [roles[i],roles[j]]=[roles[j],roles[i]]; }
  return names.map((n,i)=>({ player:n, role:roles[i], alive:true }));
}

function broadcast(game, payload){ for(const p of game.players){ try{ p.ws.send(JSON.stringify(payload)); }catch{} } }
function broadcastPlayers(game){ const alive = game.players.filter(p=>p.alive).map(p=>p.name); broadcast(game, { type:'playersUpdate', players: alive, phase: game.phase, story: game.story||'' }); }
function broadcastStory(game, message, votes=null){ game.story = message; broadcast(game, { type:'main', message, votes }); }

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    let data; try{ data = JSON.parse(msg); } catch { return; }
    const { type } = data;
    if(type==='createGame'){
      const id = Math.random().toString(36).slice(2,7);
      games.set(id, { players: [], roles: [], votes:{}, nightActions:{}, phase:'lobby', story:'' });
      ws.send(JSON.stringify({ type:'gameCreated', gameId:id }));
      return;
    }
    const game = games.get(data.gameId); if(!game && type!=='createGame'){ ws.send(JSON.stringify({ type:'error', message:'Game not found' })); return; }
    if(type==='joinGame'){
      if(game.players.find(p=>p.name===data.name)){ ws.send(JSON.stringify({ type:'error', message:'Name taken' })); return; }
      game.players.push({ name:data.name, ws, alive:true, role:null });
      ws.send(JSON.stringify({ type:'joinedGame', gameId:data.gameId }));
      broadcastPlayers(game); return;
    }
    if(type==='startGame'){
      const names = game.players.map(p=>p.name);
      if(names.length<5){ ws.send(JSON.stringify({ type:'error', message:'Need at least 5 players' })); return; }
      game.roles = assignRoles(names);
      for(const p of game.players){ const r = game.roles.find(rr=>rr.player===p.name).role; p.role=r; try{ p.ws.send(JSON.stringify({ type:'yourRole', role:r })); }catch{} }
      game.phase='night'; broadcastStory(game,'🌙 Night 1 begins... The town falls silent.'); return;
    }
    if(type==='nightAction'){ game.nightActions[data.player]=data.action; return; }
    if(type==='resolveNight'){
      const actions = Object.values(game.nightActions);
      const mafiaTarget = actions.find(a=>a.action==='kill')?.target || null;
      const doctorSave = actions.find(a=>a.action==='save')?.target || null;
      let deathMsg = '🌅 Dawn breaks. Everyone survived the night.';
      if(mafiaTarget && mafiaTarget!==doctorSave){
        const victim = game.players.find(p=>p.name===mafiaTarget);
        if(victim){ victim.alive=false; deathMsg = `🌅 Dawn breaks. ${victim.name} was found dead.`; }
      }
      const det = Object.entries(game.nightActions).find(([k,a])=>a.action==='investigate');
      if(det){
        const detectiveName = det[0]; const target = det[1].target;
        const isMafia = (game.roles.find(r=>r.player===target)?.role==='Mafia');
        const detPlayer = game.players.find(p=>p.name===detectiveName);
        try{ detPlayer.ws.send(JSON.stringify({ type:'investigationResult', target, isMafia })); }catch{}
      }
      game.nightActions={}; game.votes={}; game.phase='day'; broadcastPlayers(game); broadcastStory(game, deathMsg, {}); return;
    }
    if(type==='vote'){
      game.votes[data.player] = data.vote;
      const tally={}; for(const v of Object.values(game.votes)){ tally[v]=(tally[v]||0)+1; }
      broadcastStory(game, game.story||'Day phase.', tally); return;
    }
    if(type==='resolveDay'){
      const counts={}; for(const v of Object.values(game.votes)) counts[v]=(counts[v]||0)+1;
      let lynched=null, max=0; for(const [n,c] of Object.entries(counts)){ if(c>max){ max=c; lynched=n; } }
      if(lynched){ const victim = game.players.find(p=>p.name===lynched); if(victim){ victim.alive=false; broadcastStory(game, `⚖️ The town lynched ${victim.name}. Role: ${victim.role}`); } }
      else broadcastStory(game,'⚖️ No one was lynched.');
      game.votes={}; game.phase='night'; broadcastPlayers(game); broadcastStory(game,'🌙 Night falls again...'); return;
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, ()=>console.log('Server running on', PORT));
