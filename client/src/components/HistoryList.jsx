import React, { useEffect } from "react";
import { useRoom } from "../context/RoomContext";
import { HistoryItem } from "./HistoryItem";

export const HistoryList = () => {
  const {
    isConnected,
    historyItems,
    wrongPasswordError,
    clearAllHistory,
    syncHistoryState
  } = useRoom();

  // Reload history from IndexedDB when database connection is ready
  useEffect(() => {
    if (isConnected) {
      syncHistoryState();
    }
  }, [isConnected]);

  // Case 1: Not inside any room session
  if (!isConnected) {
    return (
      <div className="history-empty">
        Join a room to see the shared clipboard history.
      </div>
    );
  }

  // Case 2: Wrong passcode entered (fails E2EE decryption validation check)
  if (wrongPasswordError) {
    return (
      <div
        className="history-empty"
        style={{
          color: "#e74c3c",
          border: "2px solid #e74c3c",
          padding: "12px",
          borderRadius: "4px",
          textAlign: "left"
        }}
      >
        ⚠️ <strong>Wrong Password.</strong> The room exists but your passcode does not match. Leave and re-join with the correct password.
      </div>
    );
  }

  // Case 3: Connected but empty logs feed
  if (!historyItems || historyItems.length === 0) {
    return (
      <div className="history-empty">
        No synchronized clipboard items yet. Connect and sync text or drag files!
      </div>
    );
  }

  // Case 4: Normal list render
  return (
    <div className="history-list">
      {historyItems.map((item, index) => (
        <HistoryItem key={item.id || index} item={item} />
      ))}
    </div>
  );
};
export default HistoryList;
