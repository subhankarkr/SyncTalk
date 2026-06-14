# ⚡ SyncTalk — E2EE P2P Clipboard & File Sharing

SyncTalk is a secure, low-latency, zero-knowledge real-time clipboard sharing and file transfer application. Built with a modern Brutalist-retro aesthetic, it enables devices to instantly sync text and transfer files directly peer-to-peer using WebRTC, with all data fully encrypted end-to-end (E2EE) in the browser.

---

## ✨ Features

* 🔒 **Zero-Knowledge End-to-End Encryption (E2EE)**: Plaintext clipboard contents and files are encrypted/decrypted inside the browser using AES-GCM (Web Crypto API) with a passcode-derived key (PBKDF2). The server acts as a blind relay and never sees your secret key or unencrypted data.
* ⚡ **Real-Time Clipboard Sync**: Text typed or copied is instantly pushed to all devices connected to the same room.
* 📁 **Direct P2P File Sharing**: Large files are transferred directly between browser sessions using WebRTC `DataChannels`, bypassing the server entirely for maximum transfer speed. Includes real-time progress indicators and unexpected disconnect recovery.
* 👥 **Precise Active Peer Counter**: Real-time count of active devices in each room with immediate zombie connection pruning.
* 🗄️ **Automatic 24-Hour TTL History**: Synchronized clipboard logs are cached securely on the server with a 24-hour Time-To-Live (TTL) expiration in MongoDB.
* 💾 **Private Local Storage**: Clipboard logs are privately archived in the user's browser using IndexedDB.
* 📡 **Scalable Pub/Sub Architecture**: Uses Redis Pub/Sub to scale room message broadcasting horizontally across multiple server nodes.

---

## 🏗️ Technical Architecture

```text
                  [ Direct WebRTC DataChannel (P2P File Transfer) ]
                  ┌──────────────────────────────────────────────┐
                  │                                              │
                  ▼                                              ▼
        ┌───────────────────┐                         ┌───────────────────┐
        │  Client A (Vite)  │                         │  Client B (Vite)  │
        └─────────┬─────────┘                         └─────────┬─────────┘
                  │                                             │
                  │ WebSocket (E2EE Signals)                    │ WebSocket (E2EE Signals)
                  ▼                                             ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                    Express & Socket.IO Server                   │
        └─────────┬─────────────────────────────────────────────┬─────────┘
                  │                                             │
                  ▼                                             ▼
        ┌───────────────────┐                         ┌───────────────────┐
        │   MongoDB Atlas   │                         │    Redis Cache    │
        │  (24h TTL logs)   │                         │  (Pub/Sub Sync)   │
        └───────────────────┘                         └───────────────────┘
```

### The Security Model
1. **Key Derivation**: When you enter a room name and passcode, SyncTalk derives a 256-bit AES-GCM cryptographic key in-memory using **PBKDF2** with a salt. The passcode is **never** sent to the server.
2. **Encryption**: All text strings and file byte chunks are encrypted client-side *before* transmission.
3. **Decryption**: Receiving clients use the same derived key to decrypt the payload. If a client attempts to connect with an incorrect passcode, the local decryption fails, the content is discarded, and a security warning banner is displayed.

---

## 🛠️ Local Development

### Prerequisites
* **Node.js** (v18 or higher)
* **MongoDB** (Running locally or a cloud Atlas connection string)
* **Redis** (Running locally or cloud connection string)

### 1. Clone & Install Dependencies
```bash
git clone <your-repository-url>
cd SyncTalk
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/synctalk
REDIS_URI=redis://localhost:6379
```

### 3. Launch Development Servers
Start both the backend server and the frontend Vite server in development mode using a single command:
```bash
npm run dev
```
* The backend server runs on `http://localhost:5000`
* The React frontend runs on `http://localhost:5173` (or `5174`)

---

## 📁 Project Structure

```text
SyncTalk/
├── client/                 # Frontend React App (Vite)
│   ├── src/
│   │   ├── components/     # Modular UI panels (Connection, Clipboard, History)
│   │   ├── context/        # RoomContext (handles socket connection states)
│   │   ├── hooks/          # Crypto, IndexedDB, and WebRTC file chunking hooks
│   │   ├── App.jsx         # Brutalist Retro layout container
│   │   └── index.css       # Core design styling
│   └── vite.config.js      # Proxies socket events to port 5000
│
├── server/                 # Backend Node.js Service
│   ├── db/                 # MongoDB & Redis client configurations
│   ├── index.js            # App boots, statically hosts client build
│   └── socket.js           # Socket.IO room lifecycle & signaling
│
├── package.json            # Orchestrates scripts and monorepo dependencies
└── DEPLOYMENT.md           # Step-by-step instructions for cloud launch
```
