import { defineStore } from "pinia";
import { ref } from "vue";

export const useSudokuStore = defineStore("sudoku", () => {
  // Game State
  const players = ref([]); // [{ id, name, avatar... }]
  const initialBoard = ref([]); // Read-only puzzle mask (0 is empty)
  const currentBoard = ref([]); // Current state of the grid
  const status = ref("waiting"); // 'waiting' | 'playing' | 'win'
  const size = ref(4);
  const difficulty = ref("easy");

  // Local Interaction State
  const focusMap = ref({}); // { [playerId]: { row, col } }

  // Actions
  function updateState(payload) {
    if (!payload) return;

    if (payload.players) players.value = payload.players;
    if (payload.initialBoard) initialBoard.value = payload.initialBoard;
    if (payload.currentBoard) currentBoard.value = payload.currentBoard;
    if (payload.status) status.value = payload.status;
    if (payload.size) size.value = payload.size;
    if (payload.difficulty) difficulty.value = payload.difficulty;
  }

  function updatePlayerFocus(playerId, { row, col }) {
    focusMap.value[playerId] = { row, col };
  }

  // Optimistic update for smoother UI
  function setCell(row, col, val) {
    if (currentBoard.value[row]) {
      currentBoard.value[row][col] = val;
    }
  }

  function resetGame() {
    players.value = [];
    initialBoard.value = [];
    currentBoard.value = [];
    status.value = "waiting";
    // Keep size/difficulty preference
    focusMap.value = {};
  }

  return {
    players,
    initialBoard,
    currentBoard,
    status,
    size,
    difficulty,
    focusMap,

    updateState,
    updatePlayerFocus,
    setCell,
    resetGame
  };
});
