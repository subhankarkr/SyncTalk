import React, { useState, useEffect } from "react";
import { useRoom } from "../context/RoomContext";

export const ConnectionPanel = () => {
  const { isConnected, connectRoom, disconnectRoom, activeRoomId, activePasscode } = useRoom();

  const [roomId, setRoomId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [senderName, setSenderName] = useState("");

  // Auto-connect if query parameters exist in the invite URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteRoom = urlParams.get("room");
    const inviteKey = urlParams.get("key");

    if (inviteRoom && inviteKey) {
      setRoomId(inviteRoom);
      setPasscode(inviteKey);
      
      // Small timeout to make sure the app database is ready
      const timeout = setTimeout(() => {
        connectRoom(inviteRoom, inviteKey, senderName || "Anonymous");
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, []);

  const handleGenerateRoom = () => {
    const randomId = `room-${Math.random().toString(36).substring(2, 11)}`;
    setRoomId(randomId);
  };

  const handleConnectClick = () => {
    if (isConnected) {
      disconnectRoom();
    } else {
      if (!roomId.trim() || !passcode.trim()) {
        alert("Please enter both Room ID and E2EE Passcode.");
        return;
      }
      connectRoom(roomId, passcode, senderName);
    }
  };

  const handleCopyInviteLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(activeRoomId)}&key=${encodeURIComponent(activePasscode)}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert("Invite link copied to clipboard! Share it with others to join instantly.");
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
      });
  };

  return (
    <div>
      <h3 className="section-title">Connection</h3>
      
      <div className="form-group" style={{ marginBottom: "12px" }}>
        <label className="form-label" htmlFor="room-id">Room Name</label>
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="text"
            id="room-id"
            className="form-input"
            placeholder="e.g. kitchen-chat"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isConnected}
          />
          <button
            id="btn-generate-room"
            className="btn"
            style={{ padding: "4px 10px" }}
            title="Generate Room ID"
            onClick={handleGenerateRoom}
            disabled={isConnected}
          >
            🎲
          </button>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: "12px" }}>
        <label className="form-label" htmlFor="passcode">Room Password (Key)</label>
        <input
          type="password"
          id="passcode"
          className="form-input"
          placeholder="Type passcode..."
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          disabled={isConnected}
        />
      </div>

      <div className="form-group" style={{ marginBottom: "16px" }}>
        <label className="form-label" htmlFor="sender-name">Your Name</label>
        <input
          type="text"
          id="sender-name"
          className="form-input"
          placeholder="e.g. Alice"
          max={30}
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          disabled={isConnected}
        />
      </div>

      <button
        id="btn-connect"
        className={`btn ${isConnected ? "btn--danger" : "btn--success"}`}
        style={{ width: "100%" }}
        onClick={handleConnectClick}
      >
        {isConnected ? "Leave Room" : "Join Room / Connect"}
      </button>

      {isConnected && (
        <button
          id="btn-share-link"
          className="btn btn--secondary"
          style={{ width: "100%", marginTop: "10px" }}
          onClick={handleCopyInviteLink}
        >
          🔗 Copy Invite Link
        </button>
      )}
    </div>
  );
};
export default ConnectionPanel;
