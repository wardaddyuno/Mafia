// frontend/src/App.js
import React from "react";
import HostPage from "./pages/HostPage";
import PlayerPage from "./pages/PlayerPage";
import DisplayPage from "./pages/DisplayPage";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");

  // HARD DEFAULT TO HOST
  if (!mode || (mode !== "player" && mode !== "display" && mode !== "host")) {
    window.location.search = "?mode=host";
    return null;
  }

  if (mode === "player") return <PlayerPage />;
  if (mode === "display") return <DisplayPage />;
  return <HostPage />;
}
