# Wardaddy's Mafia Royale — Render Deployment

This package is ready for deployment on Render as a single Node service that serves a React build and hosts a WebSocket relay.

## How it works

- **frontend/**: React app (Create React App). Built during Render's build step.
- **backend/**: Express server + `ws` for WebSockets. Serves the React build from `frontend/build` and exposes `/healthz` for health checks.
- **WebSockets**: Connect to `wss://<your-service>.onrender.com` (same origin) and send JSON messages like:
  ```json
  { "type": "join", "room": "ABCD" }
  { "type": "event", "payload": {"action":"vote","target":"player2"} }
  ```
  Events are broadcast to clients in the same room. Use `"leave"` to exit.

## Deploy on Render

1) Create a new **Web Service** from your repo or upload.
2) Set **Environment** = Node.
3) Set **Build Command**: `npm install && npm run build`
4) Set **Start Command**: `npm start`
5) After deploy, open the URL. The frontend is on `/`, and the backend responds to `/healthz`.

## Local dev (optional)

```bash
# In project root
npm install         # installs frontend + backend deps
npm run build       # builds React app into frontend/build
npm start           # starts Express + WebSocket server on PORT (default 10000)
# Visit http://localhost:10000
```

## Notes

- CRA uses relative paths via `homepage: "."` to ensure static assets are served correctly behind a non-root path if needed.
- Node 18+ is required on Render (set via `engines`).
- The WebSocket relay is minimal by design. If your frontend expects different message shapes, adapt `backend/server.js` accordingly.
