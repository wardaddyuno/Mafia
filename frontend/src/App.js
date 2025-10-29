import React from 'react';
import HostPage from './pages/HostPage';
import PlayerPage from './pages/PlayerPage';
import DisplayPage from './pages/DisplayPage';
export default function App(){ const mode=new URLSearchParams(window.location.search).get('mode')||'host'; if(mode==='player') return <PlayerPage/>; if(mode==='display') return <DisplayPage/>; return <HostPage/>; }
