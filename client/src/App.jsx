import React from "react";
import { RoomProvider, useRoom } from "./context/RoomContext";
import ConnectionPanel from "./components/ConnectionPanel";
import StatusBar from "./components/StatusBar";
import TextSync from "./components/TextSync";
import FileDropZone from "./components/FileDropZone";
import ProgressBar from "./components/ProgressBar";
import HistoryList from "./components/HistoryList";
import "./App.css";

const MainLayout = () => {
  const { isConnected, clearAllHistory } = useRoom();

  return (
    <div className="app-window">
      {/* Window Header Title Bar */}
      <div className="window-header">
        <div className="window-title">
          <span>⚡</span> SyncTalk
        </div>
        <div className="window-controls">
          <button className="win-btn win-btn--min" title="Minimize"></button>
          <button className="win-btn win-btn--max" title="Maximize"></button>
          <button className="win-btn win-btn--close" title="Close"></button>
        </div>
      </div>

      {/* App Body Layout */}
      <div className="window-body">
        {/* Sidebar Configuration */}
        <div className="sidebar">
          <ConnectionPanel />
          <StatusBar />

          {isConnected && (
            <div style={{ marginTop: "auto" }}>
              <h3 className="section-title">
                History
                <button
                  id="btn-clear-history"
                  className="history-item-btn"
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: "0.75rem",
                    textDecoration: "underline",
                    cursor: "pointer"
                  }}
                  onClick={clearAllHistory}
                >
                  Clear
                </button>
              </h3>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Textarea Entry Box */}
          <TextSync />

          {/* File Upload Area */}
          <FileDropZone />

          {/* Progress Container */}
          <ProgressBar />

          {/* Local Clipboard History Feed */}
          <div>
            <h3 className="section-title">Shared Clipboard History</h3>
            <HistoryList />
          </div>
        </div>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <RoomProvider>
      <MainLayout />
    </RoomProvider>
  );
};

export default App;
