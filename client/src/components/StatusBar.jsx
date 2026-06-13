import React from "react";
import { useRoom } from "../context/RoomContext";

export const StatusBar = () => {
  const { isConnected, activeRoomId, peerCount } = useRoom();

  const getPeerText = () => {
    return peerCount === 1 ? "1 peer online (just you)" : `${peerCount} peers online`;
  };

  return (
    <>
      <div className="status-box">
        <div className={`status-dot ${isConnected ? "status-dot--online" : ""}`}></div>
        <div className="status-text">
          {isConnected ? `ONLINE: ${activeRoomId.toUpperCase()}` : "DISCONNECTED"}
        </div>
      </div>
      
      {isConnected && (
        <div id="peer-count-box" style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          marginTop: "6px",
          padding: "4px 8px",
          background: "rgba(0,200,100,0.1)",
          border: "1px solid rgba(0,200,100,0.3)",
          borderRadius: "4px",
          color: "#00a86b"
        }}>
          👥 <span>{getPeerText()}</span>
        </div>
      )}
    </>
  );
};
export default StatusBar;
