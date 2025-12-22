import { shallowRef, ref } from "vue";
import { io } from "socket.io-client";

/**
 * Singleton state
 */
const socket = shallowRef(null);
const connected = ref(false);
const listeners = new Map(); // { appId: { type: [callbacks] } }

/**
 * Initialize Socket Connection
 * @param {string} url
 */
function initSocket(url = "http://localhost:3000") {
  if (socket.value) return socket.value;

  const s = io(url, {
    transports: ["websocket"],
    autoConnect: true
  });

  s.on("connect", () => {
    console.log("[GameBridge] Connected:", s.id);
    connected.value = true;
  });

  s.on("disconnect", () => {
    console.log("[GameBridge] Disconnected");
    connected.value = false;
  });

  // Global message dispatcher
  s.on("message", packet => {
    const { appId, type, payload } = packet;
    if (listeners.has(appId)) {
      const appListeners = listeners.get(appId);
      if (appListeners[type]) {
        appListeners[type].forEach(cb => cb(payload));
      }
    }
  });

  socket.value = s;
  return s;
}

/**
 * Use Game Bridge Composable
 */
export function useGameBridge() {
  // Ensure socket is initialized (lazy init)
  if (!socket.value) {
    initSocket();
  }

  const sendAction = (appId, type, payload) => {
    if (!socket.value) return;
    socket.value.emit("action", { appId, type, payload });
  };

  const onAction = (appId, type, callback) => {
    if (!listeners.has(appId)) {
      listeners.set(appId, {});
    }
    const appListeners = listeners.get(appId);
    if (!appListeners[type]) {
      appListeners[type] = [];
    }
    appListeners[type].push(callback);

    // Return unsubscribe function
    return () => {
      appListeners[type] = appListeners[type].filter(cb => cb !== callback);
    };
  };

  return {
    socket,
    connected,
    sendAction,
    onAction
  };
}
