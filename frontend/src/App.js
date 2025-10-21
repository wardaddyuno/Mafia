import React, {useEffect, useRef, useState} from 'react';

const useWS = () => {
  const wsRef = useRef(null);
  const [events, setEvents] = useState([]);
  useEffect(()=>{
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    wsRef.current = ws;
    const onMsg = (e)=>setEvents(ev=>[...ev, JSON.parse(e.data)]);
    ws.addEventListener('message', onMsg);
    return ()=>{ ws.removeEventListener('message', onMsg); ws.close(); };
  },[]);
  const send = (obj)=> wsRef.current && wsRef.current.readyState===1 && wsRef.current.send(JSON.stringify(obj));
  return { send, events };
};

export default function App(){
  const { send, events } = useWS();
  const [gameId, setGameId] = useState('');
  const [name, setName] = useState('');
  const [players, setPlayers] = useState([]);
  const [role, setRole] = useState('');
  const [phase, setPhase] = useState('lobby');
  const [story, setStory] = useState('Welcome to Mafia Royale.');
  const [votes, setVotes] = useState({});
  const [displayMode, setDisplayMode] = useState(false);

  useEffect(()=>{
    for(const ev of events){
      if(ev.type==='gameCreated') setGameId(ev.gameId);
      if(ev.type==='playersUpdate'){ setPlayers(ev.players); setPhase(ev.phase); if(ev.story) setStory(ev.story); }
      if(ev.type==='yourRole') setRole(ev.role);
      if(ev.type==='investigationResult'){ alert(`${ev.target} ${ev.isMafia ? 'IS' : 'is NOT'} Mafia`); }
      if(ev.type==='main'){ if(ev.message) setStory(ev.message); setVotes(ev.votes || {}); }
      if(ev.type==='error'){ alert(ev.message); }
    }
  },[events]);

  const createGame = ()=> send({ type:'createGame' });
  const joinGame = ()=> { if(!gameId || !name) return; send({ type:'joinGame', gameId, name }); };
  const startGame = ()=> send({ type:'startGame', gameId });
  const vote = (target)=> send({ type:'vote', gameId, player:name, vote:target });
  const resolveNight = ()=> send({ type:'resolveNight', gameId });
  const resolveDay = ()=> send({ type:'resolveDay', gameId });
  const nightAction = (action, target)=> send({ type:'nightAction', gameId, player:name, action:{ action, target } });

  return (
    <div className="wrap">
      <h1>Mafia Royale</h1>

      <div className="row">
        <div className="card" style={{flex:'1 1 320px'}}>
          <h3>Game Controls</h3>
          <div className="row">
            <button className="btn" onClick={createGame}>Create Game</button>
            <input placeholder="Game ID" value={gameId} onChange={e=>setGameId(e.target.value)} />
          </div>
          <div className="row">
            <input placeholder="Your codename" value={name} onChange={e=>setName(e.target.value)} />
            <button className="btn" onClick={joinGame}>Join</button>
          </div>
          <div className="row">
            <button className="btn" onClick={startGame} disabled={!gameId}>Start</button>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={displayMode} onChange={e=>setDisplayMode(e.target.checked)} />
              Main Display mode
            </label>
          </div>
          <div className="row">
            <button className="btn" onClick={resolveNight} disabled={!gameId}>Resolve Night</button>
            <button className="btn" onClick={resolveDay} disabled={!gameId}>Resolve Day</button>
          </div>
          <div style={{marginTop:8,opacity:.8}}>Phase: <b>{phase}</b> &nbsp; Role: <b>{role||'-'}</b></div>
        </div>

        <div className="card" style={{flex:'1 1 320px'}}>
          <h3>Players</h3>
          <div>{players.length ? players.join(', ') : 'None yet'}</div>
          {phase==='day' && !displayMode && (
            <div style={{marginTop:10}}>
              <h4>Vote to eliminate</h4>
              <div className="row">
                <select onChange={e=>vote(e.target.value)} defaultValue="">
                  <option value="" disabled>Select player</option>
                  {players.filter(p=>p!==name).map(p=>(<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
            </div>
          )}
          {phase==='night' && !displayMode && role && role!=='Villager' && (
            <div style={{marginTop:10}}>
              <h4>Night Action ({role})</h4>
              <div className="row">
                <select id="targetSel" defaultValue="">
                  <option value="" disabled>Select target</option>
                  {players.filter(p=>p!==name).map(p=>(<option key={p} value={p}>{p}</option>))}
                </select>
                <button className="btn" onClick={()=>{
                  const t=document.getElementById('targetSel').value;
                  if(!t) return;
                  const a = role==='Mafia'?'kill':role==='Doctor'?'save':'investigate';
                  nightAction(a, t);
                }}>Submit</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Story</h3>
        <div style={{fontSize:'1.25rem', lineHeight:1.6}}>{story}</div>
        <div style={{marginTop:10}}>
          {!!Object.keys(votes||{}).length && <>
            <h4>Live Votes</h4>
            <div className="votes">
              {Object.entries(votes).map(([target,count])=>(
                <span key={target}>{target}: <b>{count}</b></span>
              ))}
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}
