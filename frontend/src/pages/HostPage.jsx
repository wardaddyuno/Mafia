import React, {useEffect, useRef, useState} from 'react';
import { useWS } from '../ws';

export default function HostPage(){
  const { send, events } = useWS();
  const [gameId, setGameId] = useState('');
  const [hostKey, setHostKey] = useState('');
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState('lobby');
  const [story, setStory] = useState("Welcome to Wardaddy's Mafia Royale.");
  const [remaining, setRemaining] = useState(null);
  const shown = useRef(false);

  useEffect(()=>{
    for(const ev of events){
      if(ev.type==='gameCreated' && !shown.current){
        shown.current = true;
        setGameId(ev.gameId); setHostKey(ev.hostKey);
        alert(`Game ID: ${ev.gameId}\nHost Key: ${ev.hostKey}`);
      }
      if(ev.type==='playersUpdate'){ setPlayers(ev.players); setPhase(ev.phase); }
      if(ev.type==='main' && ev.message){ setStory(ev.message); }
      if(ev.type==='timer'){ setPhase(ev.phase); setRemaining(ev.remaining); }
      if(ev.type==='error'){ alert(ev.message); }
    }
  },[events]);

  const createGame = ()=>{ shown.current=false; send({ type:'createGame' }); };
  const startGame = ()=> send({ type:'startGame', gameId, hostKey });

  return (
    <div style={{padding:'16px',color:'#e8f7ff',background:'#000',minHeight:'100vh'}}>
      <h1>Wardaddy's Mafia Royale — Host</h1>
      <div style={{border:'1px solid #0af',borderRadius:12,padding:12,marginBottom:12}}>
        <button onClick={createGame}>Create Game</button>
        <div style={{marginTop:8}}><b>Game ID:</b> {gameId||'-'} &nbsp; <b>Host Key:</b> {hostKey||'-'}</div>
        <button onClick={startGame} disabled={!gameId||!hostKey||phase!=='lobby'||players.length<5} style={{marginTop:8}}>Start Game</button>
      </div>
      <div style={{border:'1px solid #0af',borderRadius:12,padding:12,marginBottom:12}}>
        <h3>Players ({players.length})</h3>
        <div>{players.length? players.join(', '): 'Waiting for players...'}</div>
        <div style={{marginTop:8}}>Phase: <b>{phase}</b> {remaining!=null? `— ⏱ ${remaining}s` : ''}</div>
      </div>
      <div style={{border:'1px solid #0af',borderRadius:12,padding:12}}>
        <h3>Story</h3>
        <div>{story}</div>
      </div>
    </div>
  );
}
