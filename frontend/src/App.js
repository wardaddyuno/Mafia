import React from 'react';
import HostPage from './pages/HostPage';
import PlayerPage from './pages/PlayerPage';
import DisplayPage from './pages/DisplayPage';
export default function App(){ const p=new URLSearchParams(location.search); const m=p.get('mode')||'player'; return m==='host'?<HostPage/>:m==='display'?<DisplayPage/>:<PlayerPage/>; }
