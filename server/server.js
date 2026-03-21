import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

dotenv.config();

await connectDB();

const app = express();
const httpServer = http.createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Block Build backend is running",
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.emit("welcome", {
    message: "Socket.IO backend connected successfully",
    socketId: socket.id,
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});