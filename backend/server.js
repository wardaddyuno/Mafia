// Wardaddy's Mafia Royale backend for Render
// Express static hosting + WebSocket relay (rooms) using 'ws'
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Basic in-memory rooms: roomId -> Set of clients
const rooms = new Map();

function joinRoom(ws, roomId) {
  if (!roomId) return;
  if (!rooms.has(roomId)) rooms.put = rooms.set(roomId, new Set());
  rooms.get(roomId).add(ws);
  ws.__roomId = roomId;
}

function leaveRoom(ws) {
  const roomId = ws.__roomId;
  if (!roomId) return;
  const set = rooms.get(roomId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) rooms.delete(roomId);
  }
  ws.__roomId = undefined;
}

function broadcastToRoom(roomId, data, except) {
  const set = rooms.get(roomId);
  if (!set) return;
  for (const client of set) {
    if (client !== except && client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  }
}

// Healthcheck for Render
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// Serve frontend build
const buildDir = path.resolve(__dirname, "../frontend/build");
app.use(express.static(buildDir));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(buildDir, "index.html"));
});

// WebSocket protocol
// Expected message format: { type: "join" | "leave" | "event", room?: string, payload?: any, senderId?: string }
wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data = null;
    try { data = JSON.parse(msg.toString()); } catch { /* ignore */ }
    if (!data || typeof data !== "object") return;

    if (data.type === "join") {
      leaveRoom(ws);
      joinRoom(ws, data.room);
      ws.send(JSON.stringify({ type: "joined", room: ws.__roomId || null }));
    } else if (data.type === "leave") {
      leaveRoom(ws);
      ws.send(JSON.stringify({ type: "left" }));
    } else if (data.type === "event") {
      const roomId = ws.__roomId || data.room;
      if (roomId) {
        broadcastToRoom(roomId, { type: "event", room: roomId, payload: data.payload, senderId: data.senderId || null }, ws);
      } else {
        // No room: echo back (useful for testing)
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: "event", room: null, payload: data.payload, senderId: data.senderId || null }));
      }
    }
  });

  ws.on("close", () => {
    leaveRoom(ws);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Wardaddy's Mafia Royale server listening on ${PORT}`);
});
