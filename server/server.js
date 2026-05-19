import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use("/users", userRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ── MongoDB ───────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ── Socket.io multiplayer ─────────────────────────────────────────────────
const players = {};

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.emit("currentPlayers", players);

  players[socket.id] = { id: socket.id, x: 400, y: 300, anim: "idle", flipX: true, scene: "StarterAreaScene" };

  socket.broadcast.emit("playerJoined", players[socket.id]);

  socket.on("playerMoved", (data) => {
    if (players[socket.id]) {
      players[socket.id].x     = data.x;
      players[socket.id].y     = data.y;
      players[socket.id].anim  = data.anim;
      players[socket.id].flipX = data.flipX;
      players[socket.id].scene = data.scene;
      socket.broadcast.emit("playerMoved", players[socket.id]);
    }
  });

  socket.on("joinScene", (sceneName) => {
    if (players[socket.id]) {
      players[socket.id].scene = sceneName;
      socket.broadcast.emit("playerMoved", players[socket.id]);
    }
  });

  socket.on("getPlayers", () => {
    socket.emit("currentPlayers", players);
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit("playerLeft", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
