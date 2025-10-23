import React, {useEffect, useState} from 'react';
import { useWS } from '../ws';
import logo from '../assets/logo.png';

export default function PlayerPage(){
  const { send, events } = useWS();
  const p = new URLSearchParams(location.search);
  const [gameId, setGameId] = useState(p.get('g')||'');
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [role, setRole] = useState('');
  const [phase, setPhase] = useState('lobby');
  const [story, setStory] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);

  useEffect(()=>{
    for(const ev of events){
      if(ev.type==='joinedGame'){ setJoined(true); }
      if(ev.type==='playersUpdate'){ setPlayers(ev.players); setPhase(ev.phase); if(ev.story) setStory(ev.story); }
      if(ev.type==='yourRole'){ setRole(ev.role); roleReveal(); }
      if(ev.type==='main'){ if(ev.message) setStory(ev.message); }
      if(ev.type==='timer'){ setPhase(ev.phase); setRemaining(ev.remaining); }
      if(ev.type==='actionAck' && ev.ok){ setActionStatus('ok'); setTimeout(()=>setActionStatus(null), 2000); }
      if(ev.type==='error'){ alert(ev.message); }
    }
  },[events]);

  const roleReveal = ()=>{
    const el = document.getElementById('reveal');
    if(!el) return;
    el.style.display='block';
    el.animate([ {opacity:0, transform:'translateY(10px) scale(.98)'}, {opacity:1, transform:'translateY(0) scale(1)'} ], { duration:450, easing:'ease' });
    setTimeout(()=> el.animate([{opacity:1},{opacity:0}],{duration:350}).onfinish=()=> el.style.display='none', 1800);
  };

  const joinGame = ()=>{ if(!gameId || !name) return; send({ type:'joinGame', gameId, name }); };

  const vote = (target)=> send({ type:'vote', gameId, player:name, vote:target });
  const nightAction = (action, target)=>{ if(!target) return; setActionStatus('sent'); send({ type:'nightAction', gameId, player:name, action:{ action, target } }); };

  return (
    <div className="wrap">
      <h1><img src={logo} className="logo" alt="logo"/> Wardaddy's Mafia Royale — Player</h1>
      {remaining!=null && <div className="card" style={{textAlign:'center'}}><b>{phase==='night'?'🌙 Night':'🌞 Day'}</b> — ⏱ {remaining}s</div>}

      <div className="card">
        {!joined ? (
          <div className="row">
            <input placeholder="Game ID" value={gameId} onChange={e=>setGameId(e.target.value)} />
            <input placeholder="Display name" value={name} onChange={e=>setName(e.target.value)} />
            <button className="btn" onClick={joinGame}>Join</button>
          </div>
        ) : (
          <div style={{display:'grid',gap:6}}>
            <div><b>Game ID:</b> {gameId}</div>
            <div><b>Player:</b> {name}</div>
            {phase==='lobby' && <div style={{opacity:.85}}>Status: Waiting for the host to start the game…</div>}
          </div>
        )}
        <div style={{marginTop:8,opacity:.85}}>Phase: <b>{phase}</b> &nbsp; Role: <b>{role||'-'}</b></div>
      </div>

      <div id="reveal" className="card" style={{display:'none', textAlign:'center', fontSize:'1.05rem'}}>You are the <b>{role}</b></div>

      <div className="card">
        <h3>Actions</h3>
        {phase==='day' && joined && (
          <div className="row">
            <select onChange={e=>vote(e.target.value)} defaultValue="">
              <option value="" disabled>Select player to vote</option>
              {players.filter(p=>p!==name).map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        {phase==='night' && role && role!=='Villager' && joined && (
          <div className="row">
            <select id="tSel" defaultValue="">
              <option value="" disabled>Select target</option>
              {players.filter(p=>p!==name).map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="btn" disabled={actionStatus==='sent'||actionStatus==='ok'} onClick={()=>{
              const t=document.getElementById('tSel').value; if(!t) return;
              const a=role==='Mafia'?'kill':role==='Doctor'?'save':'investigate';
              nightAction(a,t);
            }}>{actionStatus==='ok'?'✓ Submitted':actionStatus==='sent'?'Submitting…':'Submit'}</button>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Story</h3>
        <div style={{fontSize:'1.05rem', lineHeight:1.6}}>{story||'Awaiting host...'}</div>
      </div>
    </div>
  );
}
