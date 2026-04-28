import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import { useEffect, useState, useRef } from "react";

// Cache to ensure Y.Doc and network stream survive React component unmounts
const documentCache = new Map();

// Generate a random distinct hex color for user cursors via Awareness
const getRandomDevColor = () => {
  const colors = ["#F56565", "#48BB78", "#4299E1", "#ED64A6", "#ED8936", "#9F7AEA"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const useYjsProvider = (roomId) => {
  const [syncedState, setSyncedState] = useState({ yDoc: null, provider: null });
  const mountRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    mountRef.current = true;

    console.log("🛠️ Initializing Phase 1: Collaborative P2P Y.Doc for Room:", roomId);
    
    // 1. In-Memory Singleton Pattern
    // Prevent recreation of doc & provider when component re-renders/unmounts
    let docState = documentCache.get(roomId);

    if (!docState) {
        // 1. Establish the CRDT Document
        const doc = new Y.Doc();
        
        // 2. Hardware-Level Persistence (Offline Support)
        const indexeddbProvider = new IndexeddbPersistence(roomId, doc);
        
        // 3. Configure Decentralized WebRTC Engine (Peer-to-Peer)
        // Signaling server is purely for ICE metadata handshake, bypassing DBs.
        const webrtcProvider = new WebrtcProvider(roomId, doc, {
            signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com'],
            password: 'securesphere-p2p' // End-to-End Encryption Key
        });

        docState = { doc, provider: webrtcProvider, indexeddbProvider, connections: 0, cleanupTimer: null };
        documentCache.set(roomId, docState);
    }

    if (docState.cleanupTimer) {
      clearTimeout(docState.cleanupTimer);
      docState.cleanupTimer = null;
    }

    docState.connections++;

    // 4. Implement Phase 1: Remote Cursor Awareness (The "Figma" Factor)
    const rawData = localStorage.getItem("synSession");
    const emailFull = localStorage.getItem("email") || "anonymous@syncodex.local";
    const userId = emailFull;
    const displayName = emailFull.includes("@") ? emailFull.split("@")[0] : emailFull;

    const colorKey = "synPresenceColor";
    const persistedColor = localStorage.getItem(colorKey);
    const color = persistedColor || getRandomDevColor();
    if (!persistedColor) localStorage.setItem(colorKey, color);

    let sessionName = "Unnamed Session";

    if (rawData) {
      try {
        sessionName = JSON.parse(rawData).name;
      } catch (err) {
        console.error("Failed to parse project session data:", err);
      }
    }

    // Set globally synced Awareness fields asynchronously into the CRDT ephemeral mesh
    docState.provider.awareness.setLocalStateField("sessionInfo", { name: sessionName });
    docState.provider.awareness.setLocalStateField("user", {
      id: userId,
      name: displayName,
      color,
    });

    if (mountRef.current) {
        setSyncedState({ yDoc: docState.doc, provider: docState.provider });
    }

    // 5. Soft Cleanup
    return () => {
      mountRef.current = false;
      const cached = documentCache.get(roomId);
      if (cached) {
        cached.connections--;

        if (cached.connections <= 0) {
          cached.cleanupTimer = setTimeout(() => {
            try { cached.provider?.destroy?.(); } catch {}
            try { cached.indexeddbProvider?.destroy?.(); } catch {}
            try { cached.doc?.destroy?.(); } catch {}
            documentCache.delete(roomId);
          }, 60_000);
        }
      }
    };
  }, [roomId]);

  return syncedState;
};
