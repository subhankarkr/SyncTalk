import React from "react";
import { useRoom } from "../context/RoomContext";

export const ProgressBar = () => {
  const { progress } = useRoom();

  if (!progress.visible) return null;

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span>{progress.fileName}</span>
        <span>{progress.percentage}%</span>
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
};
export default ProgressBar;
