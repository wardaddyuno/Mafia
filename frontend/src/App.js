import React from 'react';
import HostPage from './pages/HostPage';
import PlayerPage from './pages/PlayerPage';
import DisplayPage from './pages/DisplayPage';
export default function App(){ const mode=new URLSearchParams(location.search).get('mode')||'host'; return mode==='player'?<PlayerPage/>:mode==='display'?<DisplayPage/>:<HostPage/>; }
