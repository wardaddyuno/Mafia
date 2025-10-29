import React,{useEffect,useState} from 'react';
import {useWS} from '../ws';
export default function PlayerPage(){
 const {send,events}=useWS();
 const p=new URLSearchParams(location.search);
 const [gameId,setGameId]=useState(p.get('g')||'');
 const [name,setName]=useState('');
 const [joined,setJoined]=useState(false);
 const [players,setPlayers]=useState([]);
 const [role,setRole]=useState('');
 const [phase,setPhase]=useState('lobby');
 const [remaining,setRemaining]=useState(null);
 const [actionStatus,setActionStatus]=useState(null);
 useEffect(()=>{
  for(const ev of events){
   if(ev.type==='joinedGame'){ setJoined(true); }
   if(ev.type==='playersUpdate'){ setPlayers(ev.players); setPhase(ev.phase); }
   if(ev.type==='yourRole'&&!role){ setRole(ev.role); }
   if(ev.type==='timer'){ setPhase(ev.phase); setRemaining(ev.remaining); }
   if(ev.type==='actionAck'&&ev.ok){ setActionStatus('ok'); setTimeout(()=>setActionStatus(null),1500); }
   if(ev.type==='error'){ alert(ev.message); }
  }
 },[events,role]);
 const joinGame=()=>{ if(!gameId||!name) return; send({type:'joinGame',gameId,name}); };
 const vote=(target)=>send({type:'vote',gameId,player:name,vote:target});
 const nightAction=(action,target)=>{ if(!target) return; setActionStatus('sent'); send({type:'nightAction',gameId,player:name,action:{action,target}}); };
 return (<div style={{padding:'16px',color:'#e8f7ff',background:'#000',minHeight:'100vh'}}>
  <h1>Wardaddy's Mafia Royale — Player</h1>
  {remaining!=null&&<div style={{border:'1px solid #0af',borderRadius:12,padding:12,marginBottom:12}}><b>{phase==='night'?'🌙 Night':'🌞 Day'}</b> — ⏱ {remaining}s</div>}
  <div style={{border:'1px solid #0af',borderRadius:12,padding:12,marginBottom:12}}>
   {!joined ? (<div>
     <input placeholder="Game ID" value={gameId} onChange={e=>setGameId(e.target.value)} />
     <input placeholder="Display name" value={name} onChange={e=>setName(e.target.value)} />
     <button onClick={joinGame}>Join</button>
   </div>) : (<div>
     <div><b>Game ID:</b> {gameId}</div>
     <div><b>Player:</b> {name}</div>
     {phase==='lobby'&&<div style={{opacity:.85}}>Waiting for game to start…</div>}
   </div>)}
   <div style={{marginTop:8,opacity:.9}}>Phase: <b>{phase}</b> &nbsp; Role: <b>{role||'-'}</b></div>
  </div>
  <div style={{border:'1px solid #0af',borderRadius:12,padding:12}}>
   <h3>Actions</h3>
   {phase==='day'&&joined&&(<select onChange={e=>vote(e.target.value)} defaultValue="">
     <option value="" disabled>Select player to vote</option>
     {players.filter(p=>p!==name).map(p=><option key={p} value={p}>{p}</option>)}
   </select>)}
   {phase==='night'&&role&&role!=='Villager'&&joined&&(<div>
     <select id="tSel" defaultValue="">
       <option value="" disabled>Select target</option>
       {players.filter(p=>p!==name).map(p=><option key={p} value={p}>{p}</option>)}
     </select>
     <button disabled={actionStatus==='sent'||actionStatus==='ok'} onClick={()=>{
       const t=document.getElementById('tSel').value; if(!t) return;
       const a=role==='Mafia'?'kill':role==='Doctor'?'save':'investigate';
       nightAction(a,t);
     }}>{actionStatus==='ok'?'✓ Submitted':actionStatus==='sent'?'Submitting…':'Submit'}</button>
   </div>)}
  </div>
 </div>);
}
