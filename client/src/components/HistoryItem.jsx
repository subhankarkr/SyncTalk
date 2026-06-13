import React from "react";

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const HistoryItem = ({ item }) => {
  const timeStr = new Date(item.timestamp).toLocaleTimeString();

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      alert("Text copied to system clipboard!");
    } catch (err) {
      console.error("Copy operation failed:", err);
    }
  };

  if (item.type === "text") {
    return (
      <div className="history-item">
        <div className="history-item-header">
          <span className="history-item-type">Text Clipboard</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-orange)" }}>
            👤 {item.sender || "Peer"}
          </span>
          <span className="history-item-time">{timeStr}</span>
        </div>
        <div className="history-item-content">{item.content}</div>
        <div className="history-item-actions">
          <button className="history-item-btn" onClick={handleCopyText}>
            Copy
          </button>
        </div>
      </div>
    );
  }

  // File item
  return (
    <div className="history-item">
      <div className="history-item-header">
        <span className="history-item-type" style={{ background: "var(--accent-neon)" }}>
          File Transfer
        </span>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-orange)" }}>
          👤 {item.sender || "Peer"}
        </span>
        <span className="history-item-time">{timeStr}</span>
      </div>
      <div className="file-card">
        <div className="file-icon">📦</div>
        <div className="file-details">
          <span className="file-name">{item.fileName}</span>
          <span className="file-size">{formatBytes(item.fileSize)}</span>
        </div>
      </div>
      <div className="history-item-actions">
        <a
          href={item.downloadUrl}
          download={item.fileName}
          className="history-item-btn"
          style={{ textDecoration: "none", textAlign: "center" }}
        >
          Download
        </a>
      </div>
    </div>
  );
};
export default HistoryItem;
