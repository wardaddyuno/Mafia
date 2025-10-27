import React, {useEffect, useState} from 'react';
import { useWS } from '../ws';

export default function DisplayPage(){
  const { events } = useWS();
  const [story, setStory] = useState("Welcome to Wardaddy's Mafia Royale.");
  const [votes, setVotes] = useState({});
  const [phase, setPhase] = useState('lobby');
  const [remaining, setRemaining] = useState(null);

  useEffect(()=>{
    for(const ev of events){
      if(ev.type==='main'){ if(ev.message) setStory(ev.message); setVotes(ev.votes||{}); }
      if(ev.type==='timer'){ setPhase(ev.phase); setRemaining(ev.remaining); }
    }
  },[events]);

  return (
    <div style={{padding:'16px',color:'#e8f7ff',background:'#000',minHeight:'100vh',textAlign:'center'}}>
      <h1>Wardaddy's Mafia Royale — Display</h1>
      <div style={{border:'1px solid #0af',borderRadius:12,padding:12}}>
        <div style={{fontSize:'1.1rem', marginBottom:'8px'}}>{phase==='night'?'🌙 Night':'🌞 Day'} — ⏱ {remaining??'-'}s</div>
        <div style={{fontSize:'1.3rem', lineHeight:1.6}}>{story}</div>
        {!!Object.keys(votes||{}).length && <div style={{marginTop:'12px'}}>
          <h3>Live Votes</h3>
          <div>{Object.entries(votes).map(([t,c])=> <span key={t} style={{margin:'0 6px'}}>{t}: <b>{c}</b></span>)}</div>
        </div>}
      </div>
    </div>
  );
}
