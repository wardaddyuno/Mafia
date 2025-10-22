
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
const randId = () => Math.random().toString(36).slice(2,7);
const shuffle = (a)=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; };

function assignRoles(names, mafiaCount){
  if(mafiaCount==null || mafiaCount==='auto'){
    if(names.length>=12) mafiaCount=3; else if(names.length>=7) mafiaCount=2; else mafiaCount=1;
  }
  mafiaCount = Math.max(1, Math.min(mafiaCount, Math.max(1, names.length-2)));
  const roles = [...Array(mafiaCount).fill('Mafia'), 'Doctor','Detective', ...Array(Math.max(0, names.length - (mafiaCount+2))).fill('Villager')];
  shuffle(roles);
  return names.map((n,i)=>({player:n, role:roles[i], alive:true}));
}

function broadcast(game, payload){ for(const p of game.players){ try{ p.ws.send(JSON.stringify(payload)); }catch{} } }
function broadcastPlayers(game){ const alive=game.players.filter(p=>p.alive).map(p=>p.name); broadcast(game,{type:'playersUpdate',players:alive,phase:game.phase,story:game.story||''}); }
function broadcastStory(game, message, votes=null){ game.story=message; broadcast(game,{type:'main',message,votes}); }
function startTimer(game, seconds){
  if(game._tick) clearInterval(game._tick); if(game._timeout) clearTimeout(game._timeout);
  game.timerEndsAt = Date.now()+seconds*1000;
  broadcast(game,{type:'timer',phase:game.phase,remaining:seconds});
  game._tick=setInterval(()=>{ const r=Math.max(0, Math.ceil((game.timerEndsAt-Date.now())/1000)); broadcast(game,{type:'timer',phase:game.phase,remaining:r}); },1000);
  game._timeout=setTimeout(()=>{ if(game.phase==='night') resolveNight(game); else if(game.phase==='day') resolveDay(game); }, seconds*1000+50);
}
function resolveNight(game){
  const actions=Object.values(game.nightActions||{});
  const doctorSave = actions.find(a=>a.action==='save')?.target || null;
  const mafiaVotes = actions.filter(a=>a.action==='kill').map(a=>a.target);
  let mafiaTarget=null;
  if(mafiaVotes.length){
    const c={}; mafiaVotes.forEach(t=>c[t]=(c[t]||0)+1);
    const max=Math.max(...Object.values(c)); const finalists=Object.entries(c).filter(([,v])=>v===max).map(([t])=>t);
    mafiaTarget = finalists[Math.floor(Math.random()*finalists.length)];
  }
  let msg='🌅 Dawn breaks. Everyone survived the night.';
  if(mafiaTarget && mafiaTarget!==doctorSave){ const v=game.players.find(p=>p.name===mafiaTarget&&p.alive); if(v){ v.alive=false; msg=`🌅 Dawn breaks. ${v.name} was found dead.`; } }
  const det = Object.entries(game.nightActions||{}).find(([,a])=>a.action==='investigate');
  if(det){ const dName=det[0]; const target=det[1].target; const isMafia=(game.roles.find(r=>r.player===target)?.role==='Mafia'); const dP=game.players.find(p=>p.name===dName); try{ dP.ws.send(JSON.stringify({type:'investigationResult',target,isMafia})); }catch{} }
  game.nightActions={}; game.votes={}; game.phase='day'; broadcastPlayers(game); broadcastStory(game,msg,{}); startTimer(game, game.settings.daySec);
}
function resolveDay(game){
  const counts={}; for(const v of Object.values(game.votes||{})) counts[v]=(counts[v]||0)+1;
  let lynched=null,max=0; for(const [n,c] of Object.entries(counts)){ if(c>max){ max=c; lynched=n; } }
  if(lynched){ const v=game.players.find(p=>p.name===lynched&&p.alive); if(v){ v.alive=false; broadcastStory(game,`⚖️ The town lynched ${v.name}. Role: ${v.role}`); } }
  else broadcastStory(game,'⚖️ No one was lynched.');
  game.votes={}; game.phase='night'; broadcastPlayers(game); broadcastStory(game,'🌙 Night falls again...'); startTimer(game, game.settings.nightSec);
}
function requireHost(game,key){ return game.hostKey && key && key===game.hostKey; }

wss.on('connection', (ws)=>{
  ws.on('message', (raw)=>{
    let data; try{ data=JSON.parse(raw.toString()); }catch{ return; }
    const {type} = data;
    if(type==='createGame'){
      const id=randId();
      games.set(id,{ players:[], roles:[], votes:{}, nightActions:{}, phase:'lobby', story:'',
        settings:{daySec:90, nightSec:45, mafiaCount:'auto'}, hostKey:randId(), _tick:null,_timeout:null,timerEndsAt:null });
      ws.send(JSON.stringify({type:'gameCreated', gameId:id, hostKey:games.get(id).hostKey}));
      return;
    }
    const game = games.get(data.gameId);
    if(!game){ ws.send(JSON.stringify({type:'error', message:'Game not found'})); return; }

    if(type==='joinGame'){
      if(game.players.find(p=>p.name===data.name)){ ws.send(JSON.stringify({type:'error', message:'Name taken'})); return; }
      game.players.push({ name:data.name, ws, alive:true, role:null });
      ws.send(JSON.stringify({type:'joinedGame', gameId:data.gameId}));
      broadcastPlayers(game); return;
    }
    if(type==='updateSettings'){
      if(!requireHost(game, data.hostKey)){ ws.send(JSON.stringify({type:'error', message:'Host key required'})); return; }
      const s=data.settings||{};
      if(typeof s.daySec==='number' && s.daySec>=30 && s.daySec<=600) game.settings.daySec=s.daySec;
      if(typeof s.nightSec==='number' && s.nightSec>=15 && s.nightSec<=300) game.settings.nightSec=s.nightSec;
      if(s.mafiaCount==='auto' || s.mafiaCount==null) game.settings.mafiaCount='auto';
      else if(typeof s.mafiaCount==='number') game.settings.mafiaCount=s.mafiaCount;
      broadcast(game,{type:'settings', settings:game.settings}); return;
    }
    if(type==='startGame'){
      if(!requireHost(game, data.hostKey)){ ws.send(JSON.stringify({type:'error', message:'Host key required'})); return; }
      if(game.players.length<5){ broadcast(game,{type:'error', message:`Need at least 5 players. Currently joined: ${game.players.length}`}); return; }
      const names=game.players.map(p=>p.name);
      game.roles = assignRoles(names, game.settings.mafiaCount);
      for(const p of game.players){ const r=game.roles.find(rr=>rr.player===p.name).role; p.role=r; try{ p.ws.send(JSON.stringify({type:'yourRole', role:r})); }catch{} }
      game.phase='night'; broadcastPlayers(game); broadcastStory(game,'🌙 Night 1 begins... The town falls silent.'); startTimer(game, game.settings.nightSec); return;
    }
    if(type==='nightAction'){ game.nightActions[data.player]=data.action; try{ ws.send(JSON.stringify({type:'actionAck', ok:true})); }catch{} return; }
    if(type==='vote'){ game.votes[data.player]=data.vote; const tally={}; for(const v of Object.values(game.votes)) tally[v]=(tally[v]||0)+1; broadcastStory(game, game.story||'Day phase.', tally); return; }
    if(type==='resolveNight'){ if(!requireHost(game, data.hostKey)){ ws.send(JSON.stringify({type:'error', message:'Host key required'})); return; } resolveNight(game); return; }
    if(type==='resolveDay'){ if(!requireHost(game, data.hostKey)){ ws.send(JSON.stringify({type:'error', message:'Host key required'})); return; } resolveDay(game); return; }
    if(type==='announce'){ if(!requireHost(game, data.hostKey)){ ws.send(JSON.stringify({type:'error', message:'Host key required'})); return; } broadcastStory(game, `📣 ${data.message}`); return; }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, ()=>console.log('Server running on', PORT));
