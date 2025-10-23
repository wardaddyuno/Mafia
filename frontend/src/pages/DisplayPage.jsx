import React, {useEffect, useRef, useState} from 'react';
import { useWS } from '../ws';
import logo from '../assets/logo.png';
import wallpaper from '../assets/wallpaper.jpg';
import ambient from '../assets/audio/ambient_night.wav';
import sunrise from '../assets/audio/sunrise_chime.wav';
import clickSfx from '../assets/audio/ui_click.wav';

export default function DisplayPage(){
  const { events } = useWS();
  const [story, setStory] = useState('Welcome to Wardaddy\'s Mafia Royale.');
  const [votes, setVotes] = useState({});
  const [phase, setPhase] = useState('lobby');
  const [remaining, setRemaining] = useState(null);
  const musicRef = useRef(null);
  const chimeRef = useRef(null);
  const clickRef = useRef(null);
  const [lastPhase, setLastPhase] = useState('lobby');

  useEffect(()=>{
    for(const ev of events){
      if(ev.type==='main'){ if(ev.message) setStory(ev.message); setVotes(ev.votes||{}); clickRef.current?.play().catch(()=>{}); }
      if(ev.type==='timer'){
        setPhase(ev.phase); setRemaining(ev.remaining);
        if(ev.phase!==lastPhase){
          if(ev.phase==='night'){ try{ musicRef.current.volume=0.0; musicRef.current.play(); fade(musicRef.current, 0.0, 1.0, 800); }catch{} }
          if(ev.phase==='day'){ try{ fade(musicRef.current, musicRef.current.volume, 0.0, 500).then(()=>musicRef.current.pause()); chimeRef.current.play(); }catch{} }
          setLastPhase(ev.phase);
        }
      }
    }
  },[events, lastPhase]);

  const fade = (audio, from, to, ms)=> new Promise(res=>{
    const steps = 20; const dt = ms/steps; let i=0;
    const iv = setInterval(()=>{
      i++; audio.volume = from + (to-from)*(i/steps);
      if(i>=steps){ clearInterval(iv); res(); }
    }, dt);
  });

  return (
    <div className="wrap" style={{textAlign:'center'}}>
      <audio ref={musicRef} loop src={ambient} />
      <audio ref={chimeRef} src={sunrise} />
      <audio ref={clickRef} src={clickSfx} />
      <h1 style={{justifyContent:'center'}}><img src={logo} className="logo" alt="logo"/> Wardaddy's Mafia Royale — Display</h1>
      <div className="card" style={{backgroundImage:`url(${wallpaper})`, backgroundSize:'cover', backgroundPosition:'center', color:'#eafcff'}}>
        <div style={{backdropFilter:'blur(2px) brightness(0.95)', padding:'12px', borderRadius:'10px'}}>
          <div style={{fontSize:'1.3rem', marginBottom:'6px'}}>{phase==='night'?'🌙 Night':'🌞 Day'} — ⏱ {remaining??'-'}s</div>
          <div style={{fontSize:'1.6rem', lineHeight:1.7, textShadow:'0 0 12px rgba(0,229,255,.4)'}}>{story}</div>
          {!!Object.keys(votes||{}).length && <div style={{marginTop:'14px'}}>
            <h3>Live Votes</h3>
            <div className="votes" style={{fontSize:'1.05rem'}}>
              {Object.entries(votes).map(([t,c])=> <span key={t}>{t}: <b>{c}</b></span>)}
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}
