import React, {useEffect, useState} from 'react';
import { useWS } from '../ws';
import logo from '../assets/logo.png';

export default function HostPage(){
  const { send, events } = useWS();
  const p = new URLSearchParams(location.search);
  const [gameId, setGameId] = useState(p.get('g')||'');
  const [hostKey, setHostKey] = useState(p.get('k')||'');
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState('lobby');
  const [story, setStory] = useState('Welcome to Wardaddy\'s Mafia Royale.');
  const [daySec, setDaySec] = useState(90);
  const [nightSec, setNightSec] = useState(45);
  const [mafiaCount, setMafiaCount] = useState('auto');
  const [remaining, setRemaining] = useState(null);

  useEffect(()=>{
    for(const ev of events){
      if(ev.type==='gameCreated'){ setGameId(ev.gameId); setHostKey(ev.hostKey); alert(`Game: ${ev.gameId}\nHost Key: ${ev.hostKey}`); }
      if(ev.type==='playersUpdate'){ setPlayers(ev.players); setPhase(ev.phase); if(ev.story) setStory(ev.story); }
      if(ev.type==='settings'){ setDaySec(ev.settings.daySec); setNightSec(ev.settings.nightSec); setMafiaCount(ev.settings.mafiaCount==='auto'?'auto':ev.settings.mafiaCount); }
      if(ev.type==='main'){ if(ev.message) setStory(ev.message); }
      if(ev.type==='timer'){ setPhase(ev.phase); setRemaining(ev.remaining); }
      if(ev.type==='error'){ alert(ev.message); }
    }
  },[events]);

  const createGame = ()=> send({ type:'createGame' });
  const startGame = ()=> send({ type:'startGame', gameId, hostKey });
  const resolveNight = ()=> send({ type:'resolveNight', gameId, hostKey });
  const resolveDay = ()=> send({ type:'resolveDay', gameId, hostKey });
  const updateSettings = ()=> send({ type:'updateSettings', gameId, hostKey, settings:{
    daySec:Number(daySec), nightSec:Number(nightSec), mafiaCount:mafiaCount==='auto'?'auto':Number(mafiaCount)
  }});
  const announce = ()=>{ const m=prompt('Announcement text:'); if(m) send({ type:'announce', gameId, hostKey, message:m }); };

  const copy = (txt)=> navigator.clipboard?.writeText(txt).then(()=>alert('Copied!\n'+txt)).catch(()=>prompt('Copy:',txt));
  return (
    <div className="wrap">
      <h1><img src={logo} className="logo" alt="logo"/> Wardaddy's Mafia Royale — Host</h1>
      <div className="card">
        <div className="row">
          <button className="btn" onClick={createGame}>Create Game</button>
          <input placeholder="Game ID" value={gameId} onChange={e=>setGameId(e.target.value)} />
          <input placeholder="Host Key" value={hostKey} onChange={e=>setHostKey(e.target.value)} />
        </div>
        <div className="row">
          <button className="btn" onClick={()=>copy(`${location.origin}/?mode=player&g=${gameId}`)} disabled={!gameId}>Copy Player Link</button>
          <button className="btn" onClick={()=>copy(`${location.origin}/?mode=host&g=${gameId}&k=${hostKey}`)} disabled={!gameId||!hostKey}>Copy Host Link</button>
          <button className="btn" onClick={()=>copy(`${location.origin}/?mode=display&g=${gameId}`)} disabled={!gameId}>Copy Display Link</button>
        </div>
      </div>

      {remaining!=null && <div className="card" style={{textAlign:'center'}}>
        <b>{phase==='night'?'🌙 Night':'🌞 Day'}</b> — ⏱ {remaining}s
      </div>}

      <div className="row">
        <div className="card" style={{flex:'1 1 320px'}}>
          <h3>Settings</h3>
          <div className="row">
            <div><div><b>Day (sec)</b></div><input type="number" min="30" max="600" value={daySec} onChange={e=>setDaySec(e.target.value)} /></div>
            <div><div><b>Night (sec)</b></div><input type="number" min="15" max="300" value={nightSec} onChange={e=>setNightSec(e.target.value)} /></div>
            <div><div><b>Mafia</b></div>
              <select value={mafiaCount} onChange={e=>setMafiaCount(e.target.value)}>
                <option value="auto">Auto</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
              </select>
            </div>
            <div style={{alignSelf:'end'}}><button className="btn" onClick={updateSettings} disabled={!gameId||!hostKey}>Apply</button></div>
          </div>
          <div className="row">
            <button className="btn" onClick={startGame} disabled={!gameId||!hostKey}>Start</button>
            <button className="btn" onClick={resolveNight} disabled={!gameId||!hostKey}>Resolve Night</button>
            <button className="btn" onClick={resolveDay} disabled={!gameId||!hostKey}>Resolve Day</button>
          </div>
          <div className="row">
            <button className="btn" onClick={announce} disabled={!gameId||!hostKey}>Announcement</button>
          </div>
        </div>

        <div className="card" style={{flex:'1 1 320px'}}>
          <h3>Players ({players.length})</h3>
          <div>{players.length? players.join(', '): 'None yet'}</div>
          <div style={{marginTop:10,opacity:.8}}>Phase: <b>{phase}</b></div>
        </div>
      </div>

      <div className="card">
        <h3>Story</h3>
        <div style={{fontSize:'1.15rem', lineHeight:1.6}}>{story}</div>
      </div>
    </div>
  );
}
