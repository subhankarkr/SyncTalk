import React, { useState, useEffect } from "react";
import { useRoom } from "../context/RoomContext";

export const TextSync = () => {
  const { clipText, syncText, isConnected } = useRoom();
  const [text, setText] = useState("");

  // Update textarea when value is synchronized from another device
  useEffect(() => {
    setText(clipText);
  }, [clipText]);

  const handleSend = () => {
    if (!isConnected) {
      alert("Please connect to a room session first.");
      return;
    }
    if (!text.trim()) return;
    syncText(text);
  };

  return (
    <div className="clipboard-entry">
      <h3 className="section-title" style={{ marginBottom: "8px", border: "none", padding: 0 }}>
        Write or Paste Text
      </h3>
      <textarea
        className="clipboard-textarea"
        placeholder="Type or paste clipboard contents here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <button className="btn btn--primary" onClick={handleSend}>
          ⚡ Send Text
        </button>
      </div>
    </div>
  );
};
export default TextSync;
