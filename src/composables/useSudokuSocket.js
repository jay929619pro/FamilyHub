import { io } from "socket.io-client";
import { useSudokuStore } from "../store/sudoku";
import { ref } from "vue";

let socket = null;
const socketId = ref(null);

export function useSudokuSocket() {
  const store = useSudokuStore();

  function connect() {
    if (socket && socket.connected) {
      socketId.value = socket.id;
      return socket;
    }

    const host = window.location.hostname;
    const port = "3000";
    // Important: Connect to the Sudoku namespace
    const url = `http://${host}:${port}/sudoku`;

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
      console.log("✅ [Sudoku] Connected:", socket.id);
      socketId.value = socket.id;
    });

    socket.on("disconnect", () => {
      console.warn("❌ [Sudoku] Disconnected");
      socketId.value = null;
    });

    socket.on("state_update", payload => {
      store.updateState(payload);
    });

    socket.on("focus_update", ({ playerId, row, col }) => {
      store.updatePlayerFocus(playerId, { row, col });
    });

    socket.on("game_win", ({ winnerId }) => {
      console.log("🏆 Sudoku Solved!");
      // Additional effects can be handled in the View via status watcher
    });
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
    socketId
  };
}
