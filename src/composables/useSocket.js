import { io } from "socket.io-client";
import { useGameStore } from "../store/game";
import { ref } from "vue"; // Ensure ref is imported

// 保持 Socket 单例
let socket = null;
const socketId = ref(null); // Global reactive socket ID

export function useSocket() {
  const gameStore = useGameStore();

  function connect() {
    if (socket && socket.connected) {
      socketId.value = socket.id;
      return socket;
    }

    const host = window.location.hostname;
    const port = "3000";
    const url = `http://${host}:${port}`;

    socket = io(url, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true
    });

    _setupListeners();

    return socket;
  }

  function _setupListeners() {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("✅ [Socket] Connected:", socket.id);
      socketId.value = socket.id;
    });

    socket.on("disconnect", () => {
      console.warn("❌ [Socket] Disconnected");
      socketId.value = null;
    });

    socket.on("connect_error", err => {
      console.error("⚠️ [Socket] Connection Error:", err.message);
    });

    socket.on("stateUpdate", payload => {
      console.log("📥 [Socket] stateUpdate:", payload);
      gameStore.updateState(payload);
    });

    socket.on("timerTick", seconds => {
      gameStore.updateTimer(seconds);
    });

    socket.on("round_end", () => {
      console.log("🔔 Round End!");
    });

    socket.on("draw", data => {
      // Passive drawing helper
    });
  }

  function getSocket() {
    return socket;
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      socketId.value = null;
    }
  }

  return {
    connect,
    disconnect,
    getSocket,
    socketId // Export the ref
  };
}
