const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const { connectDB } = require("./db/mongo");
const { connectRedis } = require("./db/redis");
const { registerSocketHandlers, initRedisPubSub } = require("./socket");

// Initialize dotenv
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 3000,
  pingInterval: 1000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve React production build statically
app.use(express.static(path.join(__dirname, "../client/dist")));

// Fallback all routes to index.html for SPA router (if React Router is used later)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// Bootstrap Server
const startServer = async () => {
  // Connect storage layers
  await connectDB();
  await connectRedis();

  // Setup Pub/Sub listener & Socket.IO handlers
  initRedisPubSub(io);
  registerSocketHandlers(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`\n⚡ SyncTalk server running on http://localhost:${PORT}`);
    console.log("🚀 Real-time online clipboard engine fully active.\n");
  });
};

startServer().catch(err => {
  console.error("❌ App bootstrap failed:", err.message);
});
