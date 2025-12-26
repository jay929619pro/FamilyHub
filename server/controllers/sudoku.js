export class SudokuController {
  constructor(io) {
    this.io = io; // This should be a Namespace instance (e.g. io.of('/sudoku'))
    this.gameState = {
      status: "waiting", // waiting | playing | win
      size: 4, // 4 or 6
      difficulty: "easy",
      initialBoard: [], // The puzzle (0 for empty)
      currentBoard: [], // Current user progress
      solution: [], // The answer key
      players: [],
      // For co-op highlighting
      focus: { playerId: null, row: -1, col: -1, val: null }
    };

    this.setupRoutes();
  }

  setupRoutes() {
    this.io.on("connection", socket => {
      console.log(`[Sudoku] Player connected: ${socket.id}`);

      // Send current state on join
      socket.emit("state_update", this.getPublicState());

      socket.on("join_game", ({ name }) => {
        const existing = this.gameState.players.find(p => p.id === socket.id);
        if (!existing) {
          this.gameState.players.push({ id: socket.id, name, avatar: null });
        }
        this.broadcastState();
      });

      socket.on("start_game", ({ size = 4, difficulty = "easy" }) => {
        this.startGame(Number(size), difficulty);
      });

      socket.on("make_move", ({ row, col, val }) => {
        this.handleMove(socket.id, row, col, val);
      });

      socket.on("update_focus", ({ row, col }) => {
        // Broadcast this player's focus to others (for Coach Mode)
        socket.broadcast.emit("focus_update", { playerId: socket.id, row, col });
      });

      socket.on("check_level", () => {
        // Manual check trigger if needed, or we auto-check on every move
      });

      socket.on("restart", () => {
        this.startGame(this.gameState.size, this.gameState.difficulty);
      });

      socket.on("disconnect", () => {
        this.gameState.players = this.gameState.players.filter(p => p.id !== socket.id);
        this.broadcastState();
      });
    });
  }

  startGame(size, difficulty) {
    console.log(`[Sudoku] Starting new game: ${size}x${size} (${difficulty})`);

    // 1. Generate Solution
    const solution = this.generateSolution(size);

    // 2. Dig Holes (Create Puzzle)
    const { board } = this.digHoles(solution, size, difficulty);

    this.gameState.size = size;
    this.gameState.difficulty = difficulty;
    this.gameState.solution = solution;
    this.gameState.initialBoard = JSON.parse(JSON.stringify(board)); // Deep copy
    this.gameState.currentBoard = JSON.parse(JSON.stringify(board));
    this.gameState.status = "playing";

    this.broadcastState();
  }

  handleMove(playerId, row, col, val) {
    if (this.gameState.status !== "playing") return;

    // Validate inputs
    if (row < 0 || row >= this.gameState.size || col < 0 || col >= this.gameState.size) return;

    // Update board
    // Note: val could be 0 (clear cell)
    this.gameState.currentBoard[row][col] = val;

    // Immediate Check: Is the board full?
    if (this.isBoardFull()) {
      if (this.checkWin()) {
        this.gameState.status = "win";
        this.io.emit("game_win", { winnerId: playerId }); // Collective win
      }
    }

    this.broadcastState();
  }

  broadcastState() {
    this.io.emit("state_update", this.getPublicState());
  }

  getPublicState() {
    // Hide solution from client
    return {
      status: this.gameState.status,
      size: this.gameState.size,
      currentBoard: this.gameState.currentBoard,
      initialBoard: this.gameState.initialBoard, // Client needs to know which cells are fixed
      players: this.gameState.players,
      difficulty: this.gameState.difficulty
    };
  }

  // --- Algorithms ---

  generateSolution(size) {
    const board = Array.from({ length: size }, () => Array(size).fill(0));
    this.solveBacktrack(board, size);
    return board;
  }

  solveBacktrack(board, size) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 0) {
          const nums = this.shuffleArray(Array.from({ length: size }, (_, i) => i + 1));
          for (const num of nums) {
            if (this.isValid(board, r, c, num, size)) {
              board[r][c] = num;
              if (this.solveBacktrack(board, size)) return true;
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  isValid(board, row, col, num, size) {
    // Check Row & Col
    for (let i = 0; i < size; i++) {
      if (board[row][i] === num) return false;
      if (board[i][col] === num) return false;
    }

    // Check Region (Zone)
    // 5x5 is treated as Latin Square (No sub-grid constraints)
    if (size === 5) return true;

    // 4x4 -> 2x2 zones.
    // 6x6 -> 3 wide x 2 high is standard for "Mini Sudoku".
    let boxW, boxH;
    if (size === 4) {
      boxW = 2;
      boxH = 2;
    } else if (size === 6) {
      boxW = 3;
      boxH = 2;
    } else {
      // Fallback for 9x9 or others
      boxW = 3;
      boxH = 3;
    }

    const startRow = Math.floor(row / boxH) * boxH;
    const startCol = Math.floor(col / boxW) * boxW;

    for (let i = 0; i < boxH; i++) {
      for (let j = 0; j < boxW; j++) {
        if (board[startRow + i][startCol + j] === num) return false;
      }
    }
    return true;
  }

  digHoles(solution, size, difficulty) {
    // Difficulty Tuning: (Total Cells: 16, 25, 36)
    let holes = 0;

    if (size === 4) {
      // 16 cells.
      // Easy: 4 holes (25%) -> Very simple
      // Normal: 6 holes
      holes = difficulty === "easy" ? 4 : 6;
    } else if (size === 5) {
      // 25 cells.
      // 5x5 Easy: 8 holes (32%)
      // 5x5 Medium: 12 holes (48%)
      holes = difficulty === "easy" ? 8 : 12;
    } else if (size === 6) {
      // 36 cells.
      // 6x6 Hard: 18 holes (50%) -> Standard challenge
      holes = 18;
    } else {
      holes = 40;
    }

    // Dynamic adjustment can be added here if needed

    const board = JSON.parse(JSON.stringify(solution));
    let dug = 0;
    const cells = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c]);

    this.shuffleArray(cells);

    for (const [r, c] of cells) {
      if (dug >= holes) break;
      const temp = board[r][c];
      board[r][c] = 0;

      // Check if solution is still unique?
      // For performance on FamilyHub, we skip rigorous uniqueness check.
      // Logic relies on low hole count relative to board size for 'easy' games usually having one obvious path.

      dug++;
    }
    return { board };
  }

  isBoardFull() {
    return this.gameState.currentBoard.every(row => row.every(cell => cell !== 0));
  }

  checkWin() {
    // Compare current board with solution
    const size = this.gameState.size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (this.gameState.currentBoard[r][c] !== this.gameState.solution[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
