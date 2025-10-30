// inside component
const audioRef = useRef(null);

useEffect(() => {
  const a = new Audio("/static/ambient_night.wav");
  a.loop = true;
  a.volume = 0.35;
  audioRef.current = a;
}, []);

useEffect(() => {
  events.forEach((ev) => {
    if (ev.type === "timer") {
      setPhase(ev.phase);
      setRemaining(ev.remaining);
      if (audioRef.current) {
        if (ev.phase === "night") {
          audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }
    }
  });
}, [events]);
