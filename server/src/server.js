import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const publicDirectory = path.join(projectRoot, "public");
const port = Number(process.env.PORT) || 3000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const connectedUsers = new Map();

app.use(express.static(publicDirectory));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", users: connectedUsers.size });
});

io.on("connection", (socket) => {
  socket.on("user:join", (rawUsername) => {
    const username = String(rawUsername || "")
      .trim()
      .slice(0, 24);

    if (!username) {
      return;
    }

    connectedUsers.set(socket.id, username);
    socket.emit("users:list", [...connectedUsers.values()]);
    socket.broadcast.emit("users:list", [...connectedUsers.values()]);
    socket.broadcast.emit("system:message", {
      text: `${username} se ha unido al chat.`,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("chat:message", (rawMessage) => {
    const username = connectedUsers.get(socket.id);
    const text = String(rawMessage || "")
      .trim()
      .slice(0, 500);

    if (!username || !text) {
      return;
    }

    io.emit("chat:message", {
      id: `${socket.id}-${Date.now()}`,
      username,
      text,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("chat:typing", (isTyping) => {
    const username = connectedUsers.get(socket.id);

    if (username) {
      socket.broadcast.emit("chat:typing", {
        username,
        isTyping: Boolean(isTyping),
      });
    }
  });

  socket.on("disconnect", () => {
    const username = connectedUsers.get(socket.id);

    if (!username) {
      return;
    }

    connectedUsers.delete(socket.id);
    io.emit("users:list", [...connectedUsers.values()]);
    io.emit("system:message", {
      text: `${username} ha salido del chat.`,
      timestamp: new Date().toISOString(),
    });
  });
});

httpServer.listen(port, () => {
  console.log(`Chat realtime disponible en http://localhost:${port}`);
});
