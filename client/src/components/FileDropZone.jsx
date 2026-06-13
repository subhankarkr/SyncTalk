import React, { useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";

export const FileDropZone = () => {
  const { sendFile } = useWebRTC();
  const fileInputRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsHovered(true);
  };

  const handleDragLeave = () => {
    setIsHovered(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsHovered(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      sendFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      sendFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`drop-zone ${isHovered ? "drop-zone--hover" : ""}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="drop-zone-icon">📁</div>
      <div className="drop-zone-text">Drag & Drop Files Here to Share with Devices in this Room</div>
      <div className="drop-zone-subtext">Direct Client-to-Client Transfer</div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};
export default FileDropZone;
