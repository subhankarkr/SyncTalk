import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { useIndexedDB } from "../hooks/useIndexedDB";
import { useCrypto } from "../hooks/useCrypto";

const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const [activeRoomId, setActiveRoomId] = useState("");
  const [activePasscode, setActivePasscode] = useState("");
  const [activeSenderName, setActiveSenderName] = useState("");
  const [passcodeKey, setPasscodeKey] = useState(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [historyItems, setHistoryItems] = useState([]);
  const [wrongPasswordError, setWrongPasswordError] = useState(false);
  
  const [clipText, setClipText] = useState("");
  const [progress, setProgress] = useState({ visible: false, fileName: "", percentage: 0 });

  const [db, setDb] = useState(null);
  const socketRef = useRef(null);

  const { initDb, addHistoryItem, loadLocalHistory, clearHistory } = useIndexedDB();
  const { derivePasscodeKey, encryptPayload, decryptPayload } = useCrypto();

  // Initialize IndexedDB on mount
  useEffect(() => {
    initDb().then(database => {
      setDb(database);
    }).catch(err => {
      console.error("IndexedDB failed to boot:", err);
    });
  }, []);

  // Cleanup active socket connection on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Sync IndexedDB logs to React state helper
  const syncHistoryState = async (database) => {
    const activeDb = database || db;
    if (activeDb) {
      const items = await loadLocalHistory(activeDb);
      setHistoryItems(items);
    }
  };

  const connectRoom = async (roomId, passcode, sender) => {
    const cleanRoomId = roomId.trim().toLowerCase();
    const cleanPasscode = passcode.trim();
    const cleanSender = (sender.trim() || "Anonymous").substring(0, 30);

    const derivedKey = await derivePasscodeKey(cleanPasscode);
    
    // Set credentials in state
    setActiveRoomId(cleanRoomId);
    setActivePasscode(cleanPasscode);
    setActiveSenderName(cleanSender);
    setPasscodeKey(derivedKey);
    setWrongPasswordError(false);

    // Disconnect old socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    // Connect socket
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-room", cleanRoomId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setPeerCount(0);
      setHistoryItems([]);
      setClipText("");
      setProgress({ visible: false, fileName: "", percentage: 0 });
    });

    // Handle peer count updates
    socket.on("peer-count", (count) => {
      setPeerCount(count);
    });

    // Handle latest synced text on join
    socket.on("latest-text", async (encryptedText) => {
      if (encryptedText) {
        try {
          const payload = JSON.parse(encryptedText);
          const plainText = await decryptPayload(payload.ciphertext, payload.iv, derivedKey);
          if (!plainText.startsWith("[DECRYPTION ERROR")) {
            setClipText(plainText);
          }
        } catch (err) {
          console.error("Failed to decrypt latest text:", err);
        }
      }
    });

    // Handle history logs from MongoDB
    socket.on("clipboard-history", async (history) => {
      if (!history || history.length === 0) {
        await syncHistoryState();
        return;
      }

      let decryptFailCount = 0;
      for (const item of history) {
        try {
          const payload = JSON.parse(item.text);
          const plainText = await decryptPayload(payload.ciphertext, payload.iv, derivedKey);
          
          if (plainText.startsWith("[DECRYPTION ERROR")) {
            decryptFailCount++;
            continue;
          }

          await addHistoryItem(db, {
            type: "text",
            content: plainText,
            sender: item.sender || "Peer",
            timestamp: item.timestamp
          });
        } catch (err) {
          decryptFailCount++;
          console.error("Failed to process history record:", err);
        }
      }

      if (decryptFailCount > 0 && decryptFailCount === history.length) {
        setWrongPasswordError(true);
        return;
      }

      await syncHistoryState();
    });

    // Handle live synced clipboard updates
    socket.on("clipboard-synced", async (payload) => {
      try {
        const data = JSON.parse(payload.text);
        const plainText = await decryptPayload(data.ciphertext, data.iv, derivedKey);
        
        setClipText(plainText);

        const logItem = {
          type: "text",
          content: plainText,
          sender: payload.sender || "Peer",
          timestamp: payload.timestamp
        };
        await addHistoryItem(db, logItem);
        await syncHistoryState();
      } catch (err) {
        console.error("Failed to decrypt live clipboard event:", err);
      }
    });
  };

  const disconnectRoom = () => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const syncText = async (plainText) => {
    if (!socketRef.current || !socketRef.current.connected) return;
    if (!plainText) return;

    // Encrypt client-side
    const encrypted = await encryptPayload(plainText, passcodeKey);
    socketRef.current.emit("sync-clipboard", {
      roomId: activeRoomId,
      text: JSON.stringify(encrypted),
      sender: activeSenderName
    });

    // Add to local history immediately
    const logItem = {
      type: "text",
      content: plainText,
      sender: `${activeSenderName} (You)`,
      timestamp: Date.now()
    };
    await addHistoryItem(db, logItem);
    await syncHistoryState();
  };

  const clearAllHistory = async () => {
    if (db) {
      await clearHistory(db);
      setHistoryItems([]);
    }
  };

  return (
    <RoomContext.Provider value={{
      socket: socketRef.current,
      activeRoomId,
      activePasscode,
      activeSenderName,
      passcodeKey,
      isConnected,
      peerCount,
      historyItems,
      setHistoryItems,
      wrongPasswordError,
      clipText,
      setClipText,
      progress,
      setProgress,
      connectRoom,
      disconnectRoom,
      syncText,
      clearAllHistory,
      db,
      addHistoryItem,
      syncHistoryState
    }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => useContext(RoomContext);
