import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
// hola
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const publicDirectory = path.join(projectRoot, "public");
const dataDirectory = path.join(projectRoot, "server", "data");
const databasePath = path.join(dataDirectory, "chat.sqlite");
const port = Number(process.env.PORT) || 5000;

fs.mkdirSync(dataDirectory, { recursive: true });
const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
`);

const saveUser = database.prepare(`
  INSERT INTO users (username, first_seen, last_seen)
  VALUES (@username, @timestamp, @timestamp)
  ON CONFLICT(username) DO UPDATE SET last_seen = excluded.last_seen
`);
const saveMessage = database.prepare(`
  INSERT INTO messages (username, text, timestamp)
  VALUES (@username, @text, @timestamp)
`);
const getMessages = database.prepare(`
  SELECT id, username, text, timestamp
  FROM messages
  ORDER BY id ASC
`);

const app = express();
const httpServer = createServer(app);
const webSocketServer = new WebSocketServer({ server: httpServer });
const connectedUsers = new Map();

function sendEvent(socket, event, data) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ event, data }));
  }
}

function broadcastEvent(event, data, excludedSocket) {
  for (const socket of webSocketServer.clients) {
    if (socket !== excludedSocket) {
      sendEvent(socket, event, data);
    }
  }
}

function sendUsersList() {
  broadcastEvent("users:list", [...connectedUsers.values()]);
}

app.use(express.static(publicDirectory));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", users: connectedUsers.size });
});

webSocketServer.on("connection", (socket) => {
  socket.on("message", (rawData) => {
    let message;

    try {
      message = JSON.parse(rawData.toString());
    } catch {
      return;
    }

    if (!message || typeof message.event !== "string") {
      return;
    }

    if (message.event === "user:join") {
      const rawUsername = message.data;
      const username = String(rawUsername || "")
        .trim()
        .slice(0, 24);

      if (!username) {
        return;
      }

      const timestamp = new Date().toISOString();
      saveUser.run({ username, timestamp });
      connectedUsers.set(socket, username);
      sendEvent(socket, "chat:history", getMessages.all());
      sendUsersList();
      broadcastEvent(
        "system:message",
        {
          text: `${username} se ha unido al chat.`,
          timestamp: new Date().toISOString(),
        },
        socket,
      );
      return;
    }

    if (message.event === "chat:message") {
      const username = connectedUsers.get(socket);
      const text = String(message.data || "")
        .trim()
        .slice(0, 500);

      if (!username || !text) {
        return;
      }

      const savedMessage = {
        username,
        text,
        timestamp: new Date().toISOString(),
      };
      const result = saveMessage.run(savedMessage);

      broadcastEvent("chat:message", {
        id: result.lastInsertRowid,
        ...savedMessage,
      });
      return;
    }

    if (message.event === "chat:typing") {
      const username = connectedUsers.get(socket);

      if (username) {
        broadcastEvent(
          "chat:typing",
          {
            username,
            isTyping: Boolean(message.data),
          },
          socket,
        );
      }
    }
  });

  socket.on("close", () => {
    const username = connectedUsers.get(socket);

    if (!username) {
      return;
    }

    connectedUsers.delete(socket);
    sendUsersList();
    broadcastEvent("system:message", {
      text: `${username} ha salido del chat.`,
      timestamp: new Date().toISOString(),
    });
  });
});

httpServer.listen(port, () => {
  console.log(`Chat realtime disponible en http://localhost:${port}`);
});
