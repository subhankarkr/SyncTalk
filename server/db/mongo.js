const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn("⚠️  MONGO_URI is missing in .env. MongoDB persistence disabled.");
      return;
    }
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB connected successfully.");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
};

// ─── Clipboard Log Schema ─────────────────────────────────────────────────────
const ClipboardSchema = new mongoose.Schema({
  roomId:    { type: String, required: true, index: true },
  text:      { type: String, required: true },
  sender:    { type: String, default: "Guest" },
  timestamp: { type: Date, default: Date.now, expires: 86400 }, // 24h TTL
});

const ClipboardItem = mongoose.model("ClipboardItem", ClipboardSchema);

// ─── Query Helpers ────────────────────────────────────────────────────────────
const saveToHistory = async (roomId, text, sender) => {
  try {
    if (mongoose.connection.readyState === 1) {
      return await ClipboardItem.create({ roomId, text, sender });
    }
  } catch (err) {
    console.error("Failed to save history to MongoDB:", err.message);
  }
  return null;
};

const getLatestFromMongo = async (roomId) => {
  if (mongoose.connection.readyState !== 1) return null;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return ClipboardItem.findOne({ roomId, timestamp: { $gte: cutoff } })
    .sort({ timestamp: -1 })
    .lean();
};

const getHistory = async (roomId) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return await ClipboardItem.find({ roomId, timestamp: { $gte: cutoff } })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();
    }
  } catch (err) {
    console.error("Failed to fetch history from MongoDB:", err.message);
  }
  return [];
};

module.exports = { connectDB, saveToHistory, getLatestFromMongo, getHistory };
