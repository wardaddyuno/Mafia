import React, {useEffect, useRef, useState} from 'react';
import { useWS } from '../ws';
import logo from '../assets/logo.png';
import wallpaper from '../assets/wallpaper.jpg';

export default function DisplayPage(){
  const { events } = useWS();
  const [story, setStory] = useState('Welcome to Wardaddy\'s Mafia Royale.');
  const [votes, setVotes] = useState({});
  const [phase, setPhase] = useState('lobby');
  const [remaining, setRemaining] = useState(null);
  const musicRef = useRef(null);
  const sfxRef = useRef(null);
  const [musicReady, setMusicReady] = useState(false);

  useEffect(()=>{
    for(const ev of events){
      if(ev.type==='main'){ if(ev.message) setStory(ev.message); setVotes(ev.votes||{}); sfxRef.current?.play().catch(()=>{}); }
      if(ev.type==='timer'){ setPhase(ev.phase); setRemaining(ev.remaining); if(ev.remaining && !musicReady){ musicRef.current?.play().catch(()=>{}); setMusicReady(true);} }
    }
  },[events, musicReady]);

  return (
    <div className="wrap" style={{textAlign:'center'}}>
      <audio ref={musicRef} loop src="https://cdn.pixabay.com/download/audio/2022/03/15/audio_21cc6c6910.mp3?filename=cyberpunk-moonlight-20566.mp3" />
      <audio ref={sfxRef} src="https://cdn.pixabay.com/download/audio/2022/03/15/audio_9f3c2b5b66.mp3?filename=ui-click-1-199573.mp3" />
      <h1 style={{justifyContent:'center'}}><img src={logo} className="logo" alt="logo"/> Wardaddy's Mafia Royale — Display</h1>
      <div className="card" style={{backgroundImage:`url(${wallpaper})`, backgroundSize:'cover', backgroundPosition:'center', color:'#eafcff'}}>
        <div style={{backdropFilter:'blur(2px) brightness(0.95)', padding:'12px', borderRadius:'10px'}}>
          <div style={{fontSize:'1.6rem', marginBottom:'6px'}}>{phase==='night'?'🌙 Night':'🌞 Day'} — ⏱ {remaining??'-'}s</div>
          <div style={{fontSize:'1.8rem', lineHeight:1.7, textShadow:'0 0 12px rgba(0,229,255,.4)'}}>{story}</div>
          {!!Object.keys(votes||{}).length && <div style={{marginTop:'14px'}}>
            <h3>Live Votes</h3>
            <div className="votes" style={{fontSize:'1.1rem'}}>
              {Object.entries(votes).map(([t,c])=> <span key={t}>{t}: <b>{c}</b></span>)}
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}
