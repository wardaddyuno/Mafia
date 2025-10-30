// frontend/src/pages/HostPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useWS } from "../ws";

export default function HostPage() {
  const { send, events } = useWS();
  const [gameId, setGameId] = useState("");
  const [hostKey, setHostKey] = useState("");
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("lobby");
  const [story, setStory] = useState("Welcome to Wardaddy's Mafia Royale.");
  const [remaining, setRemaining] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // this is the key: we remember which events we already processed
  const handled = useRef(new Set());

  useEffect(() => {
    events.forEach((ev, idx) => {
      if (handled.current.has(idx)) return;
      handled.current.add(idx);

      if (ev.type === "gameCreated") {
        setGameId(ev.gameId);
        setHostKey(ev.hostKey);
        setShowModal(true);          // <<< instead of alert()
      }

      if (ev.type === "playersUpdate") {
        setPlayers(ev.players);
        setPhase(ev.phase);
      }

      if (ev.type === "main" && ev.message) {
        setStory(ev.message);
      }

      if (ev.type === "timer") {
        setPhase(ev.phase);
        setRemaining(ev.remaining);
      }

      if (ev.type === "error") {
        // keep this alert, it's a real error, not repeating
        alert(ev.message);
      }
    });
  }, [events]);

  const createGame = () => {
    // reset handled so new gameCreated can show again
    handled.current = new Set();
    send({ type: "createGame" });
  };

  const startGame = () => {
    send({ type: "startGame", gameId, hostKey });
  };

  const copy = (txt) => {
    if (!txt) return;
    try {
      navigator.clipboard.writeText(txt);
    } catch (e) {
      console.log("Clipboard failed", e);
    }
  };

  const shareLink = gameId
    ? `${window.location.origin}/?mode=player&g=${gameId}`
    : "";

  return (
    <div style={{ padding: 16, background: "#000", color: "#e8f7ff", minHeight: "100vh" }}>
      <h1>Wardaddy's Mafia Royale — Host</h1>

      <div style={{ border: "1px solid #0af", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <button onClick={createGame}>Create Game</button>
        <div style={{ marginTop: 8 }}>
          <b>Game ID:</b> {gameId || "-"}
          {gameId ? (
            <button onClick={() => copy(gameId)} style={{ marginLeft: 8 }}>
              Copy
            </button>
          ) : null}
        </div>
        <div style={{ marginTop: 4 }}>
          <b>Host Key:</b> {hostKey || "-"}
          {hostKey ? (
            <button onClick={() => copy(hostKey)} style={{ marginLeft: 8 }}>
              Copy
            </button>
          ) : null}
        </div>
        {shareLink ? (
          <div style={{ marginTop: 6 }}>
            <b>Share link:</b> {shareLink}
            <button onClick={() => copy(shareLink)} style={{ marginLeft: 8 }}>
              Copy link
            </button>
          </div>
        ) : null}
        <button
          onClick={startGame}
          disabled={!gameId || !hostKey || phase !== "lobby" || players.length < 5}
          style={{ marginTop: 8 }}
        >
          Start Game
        </button>
      </div>

      <div style={{ border: "1px solid #0af", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <h3>Players ({players.length})</h3>
        <div>{players.length ? players.join(", ") : "Waiting for players..."}</div>
        <div style={{ marginTop: 8 }}>
          Phase: <b>{phase}</b> {remaining != null ? `— ⏱ ${remaining}s` : ""}
        </div>
      </div>

      <div style={{ border: "1px solid #0af", borderRadius: 12, padding: 12 }}>
        <h3>Story</h3>
        <div>{story}</div>
      </div>

      {showModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99,
          }}
        >
          <div
            style={{
              background: "#02131f",
              border: "1px solid #0af",
              borderRadius: 12,
              padding: 16,
              minWidth: 280,
            }}
          >
            <h2>Game Created</h2>
            <p>
              <b>Game:</b> {gameId}
            </p>
            <p>
              <b>Host Key:</b> {hostKey}
            </p>
            <button onClick={() => setShowModal(false)}>OK</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
