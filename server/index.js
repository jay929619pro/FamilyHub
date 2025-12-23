const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

const app = express();
const httpServer = createServer(app);

// 配置 CORS (开发环境允许 Vite 端口访问)
app.use(cors());

// 创建 Socket 服务
const io = new Server(httpServer, {
  cors: {
    origin: "*", // 简单起见，允许所有跨域
    methods: ["GET", "POST"]
  }
});

// ====== In-Memory Database (Single Source of Truth) ======
const GAME_STATE = {
  players: [], // [{ id, name, avatar... }]
  scores: {}, // { [socketId]: number }
  currentDrawerId: null,
  currentWord: "苹果",

  // New: Game Lifecycle
  status: "waiting", // 'waiting' | 'playing' | 'result'
  timeLeft: 0, // seconds
  round: 0
};

// Word Bank
const WORD_LIST = ["苹果", "香蕉", "汽车", "房子", "小狗", "太阳", "月亮", "机器人", "西瓜", "电脑"];

let timerInterval = null;
const ROUND_DURATION = 60; // seconds

/**
 * Broadcasts the full game state to all connected clients.
 * Uses 'stateUpdate' event to synchronize UI.
 */
function broadcastState() {
  io.emit("stateUpdate", {
    players: GAME_STATE.players,
    scores: GAME_STATE.scores,
    currentDrawerId: GAME_STATE.currentDrawerId,
    currentWord: GAME_STATE.currentWord,
    status: GAME_STATE.status,
    timeLeft: GAME_STATE.timeLeft,
    round: GAME_STATE.round
  });
}

/**
 * Starts the countdown timer for the current round.
 */
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  GAME_STATE.timeLeft = ROUND_DURATION;
  GAME_STATE.status = "playing";

  // Broadcast immediately so clients show 60s
  broadcastState();

  timerInterval = setInterval(() => {
    GAME_STATE.timeLeft--;

    // Optimize: Broadcast usually only needs timeLeft, but for simplicity we broadcast state
    // Or simpler: emit distinct 'timerTick' event to reduce payload
    io.emit("timerTick", GAME_STATE.timeLeft);

    if (GAME_STATE.timeLeft <= 0) {
      endRound();
    }
  }, 1000);
}

/**
 * Ends the current round.
 */
function endRound() {
  if (timerInterval) clearInterval(timerInterval);
  GAME_STATE.status = "result";
  GAME_STATE.timeLeft = 0;

  broadcastState();
  io.emit("round_end"); // Trigger client-side animations/modals
}

/**
 * Rotates the game turn: selects new word and new drawer.
 */
function nextRound() {
  // 1. Rotate Word
  const idx = Math.floor(Math.random() * WORD_LIST.length);
  GAME_STATE.currentWord = WORD_LIST[idx];

  // 2. Rotate Drawer
  if (GAME_STATE.players.length > 0) {
    const currentIdx = GAME_STATE.players.findIndex(p => p.id === GAME_STATE.currentDrawerId);
    let nextIdx = (currentIdx + 1) % GAME_STATE.players.length;
    if (currentIdx === -1) nextIdx = 0;

    GAME_STATE.currentDrawerId = GAME_STATE.players[nextIdx].id;
  }

  // 3. Increment Round Count
  GAME_STATE.round++;

  // 4. Reset Canvas & Start Timer
  io.emit("clear_canvas");
  startTimer();
}

// ====== Socket Event Handlers ======
io.on("connection", socket => {
  console.log(`[Connect] Socket ID: ${socket.id}`);

  // --- Core Game Logic ---

  socket.on("join_game", ({ name }) => {
    // Idempotency check: Update name if exists, else create
    const existing = GAME_STATE.players.find(p => p.id === socket.id);
    if (!existing) {
      GAME_STATE.players.push({ id: socket.id, name });
      if (typeof GAME_STATE.scores[socket.id] === "undefined") {
        GAME_STATE.scores[socket.id] = 0;
      }
    } else {
      existing.name = name;
    }

    // Auto-assign drawer if lobby was empty
    if (!GAME_STATE.currentDrawerId) {
      GAME_STATE.currentDrawerId = socket.id;
    }

    broadcastState();
  });

  socket.on("next_round", () => {
    // Security: Only current drawer can force next round
    if (socket.id === GAME_STATE.currentDrawerId) {
      nextRound();
    }
  });

  // --- Real-time Drawing Events (High Frequency) ---
  // Forwarding only. No persistence for performance.

  socket.on("draw", data => {
    // data: { from: {x,y}, to: {x,y}, color, width }
    // Broadcast to everyone ELSE (optimize bandwidth)
    socket.broadcast.emit("draw", data);
  });

  socket.on("draw_start", data => {
    socket.broadcast.emit("draw_start", data);
  });

  socket.on("draw_end", () => {
    socket.broadcast.emit("draw_end");
  });

  socket.on("clear_canvas", () => {
    // Security: Only drawer can clear
    if (socket.id === GAME_STATE.currentDrawerId) {
      socket.broadcast.emit("clear_canvas");
    }
  });

  // --- Scoring System ---

  socket.on("add_score", ({ playerId, amount }) => {
    // Security: Only drawer can award points (manual mode)
    if (socket.id !== GAME_STATE.currentDrawerId) return;

    const currentScore = GAME_STATE.scores[playerId] || 0;
    GAME_STATE.scores[playerId] = currentScore + amount;

    broadcastState();
    // Trigger visual effect on clients
    io.emit("score_animate", { playerId, amount });
  });

  // --- Cleanup ---

  socket.on("disconnect", () => {
    console.log(`[Disconnect] Socket ID: ${socket.id}`);
    GAME_STATE.players = GAME_STATE.players.filter(p => p.id !== socket.id);

    // Handle edge case: Drawer left
    if (GAME_STATE.currentDrawerId === socket.id) {
      GAME_STATE.currentDrawerId = null;
      if (GAME_STATE.players.length > 0) {
        nextRound();
      }
    }
    broadcastState();
  });
});

// 托管前端构建产物 (生产模式)
app.use(express.static(path.join(__dirname, "../dist")));

const PORT = 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
