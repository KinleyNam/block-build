import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const httpServer = http.createServer(app);

app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

app.get("/", (req, res) => {
  res.json({ message: "Block Build backend is running" });
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

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

httpServer.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
