import { useEffect, useRef } from "react";
import { useRoom } from "../context/RoomContext";
import { useCrypto } from "./useCrypto";

export const useWebRTC = () => {
  const {
    socket,
    activeRoomId,
    passcodeKey,
    activeSenderName,
    setProgress,
    db,
    addHistoryItem,
    syncHistoryState
  } = useRoom();

  const { encryptFileBytes, decryptFileBytes } = useCrypto();

  const peerConnRef = useRef(null);
  const dataChannelRef = useRef(null);

  // Buffer state variables for receiving files
  const currentFileBufferRef = useRef([]);
  const currentFileBytesReceivedRef = useRef(0);
  const currentFileSizeRef = useRef(0);
  const currentFileNameRef = useRef("");
  const currentFileTypeRef = useRef("");

  // Setup data channel event handlers
  const setupDataChannelEvents = (channel) => {
    channel.binaryType = "arraybuffer";

    channel.onopen = () => console.log("WebRTC P2P DataChannel open!");

    channel.onclose = () => {
      console.log("WebRTC P2P DataChannel closed.");
      // If transfer was in progress, clean up and notify
      if (
        currentFileBytesReceivedRef.current > 0 &&
        currentFileBytesReceivedRef.current < currentFileSizeRef.current
      ) {
        setProgress({ visible: false, fileName: "", percentage: 0 });
        currentFileBufferRef.current = [];
        currentFileBytesReceivedRef.current = 0;
        alert("File transfer aborted: the other device disconnected mid-transfer.");
      }
    };

    channel.onerror = (err) => {
      console.error("DataChannel error:", err);
      setProgress({ visible: false, fileName: "", percentage: 0 });
      currentFileBufferRef.current = [];
      currentFileBytesReceivedRef.current = 0;
      alert("File transfer failed due to a connection error. Please try again.");
    };

    channel.onmessage = async (e) => {
      const data = e.data;

      // Detect EOF metadata vs File Chunk
      if (typeof data === "string" && data.startsWith("EOF:")) {
        const parts = data.split(":");
        currentFileNameRef.current = parts[1];
        currentFileTypeRef.current = parts[2];
        currentFileSizeRef.current = parseInt(parts[3], 10);

        // Reassemble blob from encrypted ArrayBuffer chunks
        const combinedBuffer = new Uint8Array(currentFileBytesReceivedRef.current);
        let offset = 0;
        for (const chunk of currentFileBufferRef.current) {
          combinedBuffer.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }

        // Decrypt full binary
        try {
          const decryptedFileBytes = await decryptFileBytes(combinedBuffer, passcodeKey);
          const fileBlob = new Blob([decryptedFileBytes], { type: currentFileTypeRef.current });
          const downloadUrl = URL.createObjectURL(fileBlob);

          // Save to IndexedDB
          await addHistoryItem(db, {
            type: "file",
            fileName: currentFileNameRef.current,
            fileSize: currentFileSizeRef.current,
            sender: "Peer",
            downloadUrl: downloadUrl,
            timestamp: Date.now()
          });
          await syncHistoryState();
        } catch (err) {
          alert("Failed to decrypt incoming file. Passcode mismatch?");
          console.error(err);
        }

        // Reset
        setProgress({ visible: false, fileName: "", percentage: 0 });
        currentFileBufferRef.current = [];
        currentFileBytesReceivedRef.current = 0;
      } else {
        // Receive file chunk
        currentFileBufferRef.current.push(data);
        currentFileBytesReceivedRef.current += data.byteLength;

        // Update progress bar
        setProgress({
          visible: true,
          fileName: "Receiving file...",
          percentage: currentFileSizeRef.current > 0
            ? Math.round((currentFileBytesReceivedRef.current / currentFileSizeRef.current) * 100)
            : 0
        });
      }
    };
  };

  // Peer initialization
  const initWebRTCPeer = (isInitiator) => {
    if (peerConnRef.current) {
      try {
        peerConnRef.current.close();
      } catch (e) {
        console.warn("Error closing old connection:", e);
      }
    }

    const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    const pc = new RTCPeerConnection(config);
    peerConnRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit("signal", { roomId: activeRoomId, candidate: e.candidate });
      }
    };

    if (isInitiator) {
      const channel = pc.createDataChannel("file-sync-channel");
      dataChannelRef.current = channel;
      setupDataChannelEvents(channel);

      pc.createOffer().then((offer) => {
        return pc.setLocalDescription(offer);
      }).then(() => {
        if (socket) {
          socket.emit("signal", { roomId: activeRoomId, sdp: pc.localDescription });
        }
      });
    } else {
      pc.ondatachannel = (e) => {
        dataChannelRef.current = e.channel;
        setupDataChannelEvents(e.channel);
      };
    }
  };

  // Listen to WebRTC signaling from the server
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async (data) => {
      if (data.sdp && data.sdp.type === "offer") {
        initWebRTCPeer(false);
      } else if (!peerConnRef.current) {
        initWebRTCPeer(false);
      }

      const pc = peerConnRef.current;
      if (data.sdp && pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("signal", { roomId: activeRoomId, sdp: answer });
        }
      } else if (data.candidate && pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn("Error adding ICE candidate:", e);
        }
      }
    };

    socket.on("signal", handleSignal);
    return () => {
      socket.off("signal", handleSignal);
    };
  }, [socket, activeRoomId]);

  // Clean up Peer connection on disconnect
  useEffect(() => {
    if (!socket) {
      if (peerConnRef.current) {
        peerConnRef.current.close();
        peerConnRef.current = null;
      }
      dataChannelRef.current = null;
    }
  }, [socket]);

  // Send a file to the peer
  const sendFile = async (file) => {
    if (!socket) {
      alert("Please connect room session before transferring files.");
      return;
    }

    initWebRTCPeer(true);

    const waitForChannel = () => new Promise((resolve, reject) => {
      const channel = dataChannelRef.current;
      if (channel && channel.readyState === "open") {
        resolve();
        return;
      }
      const timeout = setTimeout(() => reject(new Error("DataChannel open timed out")), 10000);
      const checkOpen = () => {
        const chan = dataChannelRef.current;
        if (chan && chan.readyState === "open") {
          clearTimeout(timeout);
          resolve();
        } else if (chan && chan.readyState === "closed") {
          clearTimeout(timeout);
          reject(new Error("DataChannel closed unexpectedly"));
        } else {
          setTimeout(checkOpen, 100);
        }
      };
      setTimeout(checkOpen, 100);
    });

    try {
      await waitForChannel();

      setProgress({ visible: true, fileName: file.name, percentage: 0 });

      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async (e) => {
        const fileBytes = new Uint8Array(e.target.result);
        const encryptedBytes = await encryptFileBytes(fileBytes, passcodeKey);
        const chunkSize = 16384;
        let offset = 0;

        const sendChunk = () => {
          const chan = dataChannelRef.current;
          if (!chan || chan.readyState !== "open") return;

          while (offset < encryptedBytes.byteLength) {
            const chunk = encryptedBytes.slice(offset, offset + chunkSize);

            if (chan.bufferedAmount > chan.bufferedAmountLowThreshold) {
              chan.onbufferedamountlow = () => {
                chan.onbufferedamountlow = null;
                sendChunk();
              };
              return;
            }

            chan.send(chunk.buffer);
            offset += chunkSize;

            const pct = Math.round((offset / encryptedBytes.byteLength) * 100);
            setProgress({ visible: true, fileName: file.name, percentage: pct });
          }

          // EOF
          chan.send(`EOF:${file.name}:${file.type}:${encryptedBytes.byteLength}`);

          // Save to local history immediately as sender
          addHistoryItem(db, {
            type: "file",
            fileName: file.name,
            fileSize: file.size,
            sender: `${activeSenderName} (You)`,
            downloadUrl: URL.createObjectURL(new Blob([fileBytes], { type: file.type })),
            timestamp: Date.now()
          }).then(() => syncHistoryState());

          setTimeout(() => {
            setProgress({ visible: false, fileName: "", percentage: 0 });
          }, 1500);
        };

        sendChunk();
      };
    } catch (err) {
      alert("Could not establish a P2P connection. Make sure both devices are in the same room and connected.");
      console.error("File send error:", err);
      setProgress({ visible: false, fileName: "", percentage: 0 });
    }
  };

  return { sendFile };
};
