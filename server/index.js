const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

const app = express();
const httpServer = createServer(app);

app.use(cors());

// --- Socket.IO Setup ---
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- State Management ---
// Single Source of Truth for the room
const GAME_STATE = {
  players: [], // [{ id, name, avatar... }]
  scores: {}, // { [socketId]: number }
  currentDrawerId: null,
  currentWord: "苹果",

  // Lifecycle Management
  status: "waiting", // Enum: 'waiting' | 'playing' | 'result'
  timeLeft: 0, // Game timer (seconds)
  round: 0 // Round counter
};

// Word Bank (To be expanded)
const WORD_LIST = ["苹果", "香蕉", "汽车", "房子", "小狗", "太阳", "月亮", "机器人", "西瓜", "电脑"];

// Timer Interval Reference
let timerInterval = null;
const ROUND_DURATION = 60; // seconds

// --- Core Helper Functions ---

/**
 * Sync entire state to all clients.
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
 * Start 60s countdown. Emits 'timerTick' every second.
 */
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  GAME_STATE.timeLeft = ROUND_DURATION;
  GAME_STATE.status = "playing";
  broadcastState(); // Sync initial state

  timerInterval = setInterval(() => {
    GAME_STATE.timeLeft--;

    // Broadcast tick (Lightweight sync)
    io.emit("timerTick", GAME_STATE.timeLeft);

    if (GAME_STATE.timeLeft <= 0) {
      endRound();
    }
  }, 1000);
}

/**
 * End current round, show results, stop timer.
 */
function endRound() {
  if (timerInterval) clearInterval(timerInterval);

  GAME_STATE.status = "result";
  GAME_STATE.timeLeft = 0;

  broadcastState();
  io.emit("round_end");
}

/**
 * Prepare next round: Rotate drawer, pick word, start timer.
 */
function nextRound() {
  // 1. Pick new word
  const idx = Math.floor(Math.random() * WORD_LIST.length);
  GAME_STATE.currentWord = WORD_LIST[idx];

  // 2. Rotate drawer (Round Robin)
  if (GAME_STATE.players.length > 0) {
    const currentIdx = GAME_STATE.players.findIndex(p => p.id === GAME_STATE.currentDrawerId);
    let nextIdx = (currentIdx + 1) % GAME_STATE.players.length;

    // Handle edge case where current drawer left
    if (currentIdx === -1) nextIdx = 0;

    GAME_STATE.currentDrawerId = GAME_STATE.players[nextIdx].id;
  }

  // 3. Update Lifecycle
  GAME_STATE.round++;

  // 4. Reset & Start
  io.emit("clear_canvas");
  startTimer();
}

// --- Socket Event Loop ---

io.on("connection", socket => {
  console.log(`[Connect] ${socket.id}`);

  // -- Lobby Logic --
  socket.on("join_game", ({ name }) => {
    const existing = GAME_STATE.players.find(p => p.id === socket.id);
    if (!existing) {
      GAME_STATE.players.push({ id: socket.id, name });
      if (typeof GAME_STATE.scores[socket.id] === "undefined") {
        GAME_STATE.scores[socket.id] = 0;
      }
    } else {
      existing.name = name;
    }

    // Auto-elect drawer if lobby was empty
    if (!GAME_STATE.currentDrawerId) {
      GAME_STATE.currentDrawerId = socket.id;
    }

    broadcastState();
  });

  // -- Game Flow Control --
  socket.on("next_round", () => {
    // Auth: Only drawer or new game starter can trigger
    const isDrawer = socket.id === GAME_STATE.currentDrawerId;
    const isLobby = GAME_STATE.status === "waiting" || GAME_STATE.status === "result";

    if (isDrawer || isLobby) {
      nextRound();
    }
  });

  // -- Drawing (High Frequency Relay) --
  socket.on("draw", data => socket.broadcast.emit("draw", data));
  socket.on("draw_start", data => socket.broadcast.emit("draw_start", data));
  socket.on("draw_end", () => socket.broadcast.emit("draw_end"));
  socket.on("clear_canvas", () => {
    if (socket.id === GAME_STATE.currentDrawerId) socket.broadcast.emit("clear_canvas");
  });

  // -- Scoring --
  socket.on("add_score", ({ playerId, amount }) => {
    if (socket.id !== GAME_STATE.currentDrawerId) return; // Strict auth

    const currentScore = GAME_STATE.scores[playerId] || 0;
    GAME_STATE.scores[playerId] = currentScore + amount;

    broadcastState();
    io.emit("score_animate", { playerId, amount });
  });

  // -- Cleanup --
  socket.on("disconnect", () => {
    console.log(`[Disconnect] ${socket.id}`);
    GAME_STATE.players = GAME_STATE.players.filter(p => p.id !== socket.id);

    // Drawer left logic
    if (GAME_STATE.currentDrawerId === socket.id) {
      GAME_STATE.currentDrawerId = null;
      // Eliminate timer if game empty
      if (GAME_STATE.players.length === 0) {
        if (timerInterval) clearInterval(timerInterval);
        GAME_STATE.status = "waiting";
        GAME_STATE.round = 0;
        GAME_STATE.timeLeft = 0;
      } else {
        // Force next round
        nextRound();
      }
    }
    broadcastState();
  });
});

// --- Serving Static ---
app.use(express.static(path.join(__dirname, "../dist")));

const PORT = 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
