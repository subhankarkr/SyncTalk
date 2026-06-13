const { saveToHistory, getLatestFromMongo, getHistory } = require("./db/mongo");
const { redisPub, redisSub, cacheLatestText, getLatestTextFromCache } = require("./db/redis");

// ─── Combined latest-text getter (Redis → MongoDB fallback) ───────────────────
const getLatestText = async (roomId) => {
  const cached = await getLatestTextFromCache(roomId);
  if (cached !== null) return cached;

  const latest = await getLatestFromMongo(roomId);
  if (latest) {
    await cacheLatestText(roomId, latest.text);
    return latest.text;
  }
  return "";
};

// ─── Redis Pub/Sub setup ──────────────────────────────────────────────────────
const initRedisPubSub = (io) => {
  if (!redisSub || redisSub.status !== "ready") return;

  redisSub.psubscribe("room:*").then(() => {
    console.log("📡 Redis Pub/Sub pattern subscriber active on room:*");
  }).catch((err) => {
    console.error("❌ Redis psubscribe failed:", err.message);
  });

  redisSub.on("pmessage", (pattern, channel, message) => {
    try {
      const roomId = channel.replace("room:", "");
      const payload = JSON.parse(message);
      io.to(roomId).emit("clipboard-synced", payload);
    } catch (err) {
      console.error("Error parsing Pub/Sub message:", err.message);
    }
  });
};

// ─── Socket.IO event handlers ─────────────────────────────────────────────────
const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    const ip = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
    const ua = socket.handshake.headers["user-agent"] || "Unknown";
    console.log(`🔌 Device connected: ${socket.id} | IP: ${ip} | UA: ${ua.substring(0, 80)}`);

    // Device joins a room
    socket.on("join-room", async (roomId) => {
      if (!roomId) return;
      const cleanRoomId = roomId.trim().toLowerCase();
      await socket.join(cleanRoomId);
      console.log(`🚪 Device ${socket.id} joined room: ${cleanRoomId}`);

      // Store roomId for disconnect handler
      socket.data.roomId = cleanRoomId;

      // Broadcast updated peer count
      const roomSockets = io.sockets.adapter.rooms.get(cleanRoomId);
      const socketIds = roomSockets ? Array.from(roomSockets) : [];
      
      console.log(`👥 Active sockets in room "${cleanRoomId}":`);
      socketIds.forEach(id => {
        const s = io.sockets.sockets.get(id);
        const sIp = s ? (s.handshake.headers["x-forwarded-for"] || s.handshake.address) : "unknown";
        const sUa = s ? (s.handshake.headers["user-agent"] || "unknown") : "unknown";
        console.log(`  - ${id} | IP: ${sIp} | UA: ${sUa.substring(0, 80)}`);
      });

      const roomSize = socketIds.length || 1;
      io.to(cleanRoomId).emit("peer-count", roomSize);

      // Send latest clipboard text
      const latestText = await getLatestText(cleanRoomId);
      socket.emit("latest-text", latestText);

      // Send recent history (last 30 items, last 24h)
      const history = await getHistory(cleanRoomId);
      socket.emit("clipboard-history", history);
    });

    // Client syncs clipboard text
    socket.on("sync-clipboard", async ({ roomId, text, sender }) => {
      if (!roomId || !text) return;
      const cleanRoomId = roomId.trim().toLowerCase();
      const cleanSender = sender?.trim() || "Guest";

      await saveToHistory(cleanRoomId, text, cleanSender);
      await cacheLatestText(cleanRoomId, text);

      const eventPayload = { text, sender: cleanSender, timestamp: Date.now() };

      if (redisPub && redisPub.status === "ready") {
        redisPub.publish(`room:${cleanRoomId}`, JSON.stringify(eventPayload)).catch((err) => {
          console.error("Redis publish error:", err.message);
          io.to(cleanRoomId).emit("clipboard-synced", eventPayload);
        });
      } else {
        io.to(cleanRoomId).emit("clipboard-synced", eventPayload);
      }
    });

    // Relay WebRTC signaling frames
    socket.on("signal", (data) => {
      if (!data || !data.roomId) return;
      const cleanRoomId = data.roomId.trim().toLowerCase();
      socket.to(cleanRoomId).emit("signal", data);
    });

    // Disconnect: update peer count
    socket.on("disconnect", () => {
      console.log(`🔌 Device disconnected: ${socket.id}`);
      const roomId = socket.data.roomId;
      if (roomId) {
        const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        io.to(roomId).emit("peer-count", roomSize);
      }
    });
  });
};

module.exports = { registerSocketHandlers, initRedisPubSub };
