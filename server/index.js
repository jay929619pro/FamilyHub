import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

import { readFileSync } from "fs";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORD_LISTS = JSON.parse(readFileSync(new URL("./words.json", import.meta.url)));

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
  scores: {}, // { [name]: number }
  currentDrawerId: null,
  currentWord: "苹果",
  category: "kids", // 'kids' | 'family' | 'pro'

  // Lifecycle Management
  status: "waiting", // Enum: 'waiting' | 'playing' | 'result'
  timeLeft: 0, // Game timer (seconds)
  round: 0, // Round counter

  // History for Reconnection
  recording: [], // Array of drawing events

  // Refactor: Single Winner & Next Preview
  nextDrawerId: null,
  roundWinnerId: null
};

// Timer reference
let timerInterval = null;
const ROUND_DURATION = 60; // seconds

// --- Core Helper Functions ---

function broadcastState() {
  io.emit("stateUpdate", {
    ...GAME_STATE // Spread to ensure all fields are sent
  });
}

/**
 * Start 60s countdown. Emits 'timerTick' every second.
 */
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  GAME_STATE.timeLeft = ROUND_DURATION;
  GAME_STATE.status = "playing";

  // Sync state so clients know game started
  broadcastState();

  timerInterval = setInterval(() => {
    GAME_STATE.timeLeft--;

    // Broadcast tick (Lightweight sync)
    io.emit("timerTick", GAME_STATE.timeLeft);

    // Auto-end round when time is up
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

  // Pre-calculate next drawer for UI display
  if (GAME_STATE.players.length > 0) {
    const currentIdx = GAME_STATE.players.findIndex(p => p.id === GAME_STATE.currentDrawerId);
    let nextIdx = (currentIdx + 1) % GAME_STATE.players.length;
    if (currentIdx === -1) nextIdx = 0;
    GAME_STATE.nextDrawerId = GAME_STATE.players[nextIdx].id;
  }

  broadcastState(); // Sync status change
  io.emit("round_end"); // Trigger client effects
}

/**
 * Prepare next round: Rotate drawer, pick word, start timer.
 */
function nextRound() {
  // 1. Pick new word based on category
  const list = WORD_LISTS[GAME_STATE.category] || WORD_LISTS["kids"];
  const idx = Math.floor(Math.random() * list.length);
  GAME_STATE.currentWord = list[idx];

  // 2. Rotate drawer (Round Robin)
  if (GAME_STATE.nextDrawerId) {
    GAME_STATE.currentDrawerId = GAME_STATE.nextDrawerId;
  } else if (GAME_STATE.players.length > 0) {
    const currentIdx = GAME_STATE.players.findIndex(p => p.id === GAME_STATE.currentDrawerId);
    let nextIdx = (currentIdx + 1) % GAME_STATE.players.length;
    if (currentIdx === -1) nextIdx = 0;
    GAME_STATE.currentDrawerId = GAME_STATE.players[nextIdx].id;
  }

  // Cleanup round state
  GAME_STATE.nextDrawerId = null;
  GAME_STATE.roundWinnerId = null;

  // 3. Increment Round Count
  GAME_STATE.round++;

  // 4. Reset Canvas & Start
  // Clear history and canvas
  GAME_STATE.recording = [];
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
      // Initialize score if new
      if (typeof GAME_STATE.scores[name] === "undefined") {
        GAME_STATE.scores[name] = 0;
      }
    } else {
      existing.name = name;
    }

    // Auto-elect drawer if lobby was empty
    if (!GAME_STATE.currentDrawerId) {
      GAME_STATE.currentDrawerId = socket.id;
    }

    broadcastState();

    // Sync History to the joining user ONLY
    if (GAME_STATE.recording.length > 0) {
      socket.emit("sync_history", GAME_STATE.recording);
    }
  });

  // -- Game Flow Control --
  socket.on("set_category", category => {
    if (WORD_LISTS[category]) {
      GAME_STATE.category = category;
      broadcastState();
    }
  });

  socket.on("next_round", () => {
    // Auth: Only drawer or new game starter can trigger
    // Also allow ANYONE to start if game is 'waiting' (lobby mode)
    const isDrawer = socket.id === GAME_STATE.currentDrawerId;
    const canStart = isDrawer || GAME_STATE.status === "waiting" || GAME_STATE.status === "result";

    if (canStart) {
      nextRound();
    }
  });

  // -- Drawing (High Frequency Relay) --
  socket.on("draw", data => {
    GAME_STATE.recording.push({ type: "draw", data });
    socket.broadcast.emit("draw", data);
  });

  socket.on("draw_start", data => {
    GAME_STATE.recording.push({ type: "draw_start", data });
    socket.broadcast.emit("draw_start", data);
  });

  socket.on("draw_end", () => {
    GAME_STATE.recording.push({ type: "draw_end" });
    socket.broadcast.emit("draw_end");
  });

  socket.on("clear_canvas", () => {
    if (socket.id === GAME_STATE.currentDrawerId) {
      GAME_STATE.recording = [];
      socket.broadcast.emit("clear_canvas");
    }
  });

  // -- Scoring (Single Winner) --
  socket.on("drawer_confirm_winner", ({ winnerId }) => {
    if (socket.id !== GAME_STATE.currentDrawerId) return; // Strict auth

    const targetPlayer = GAME_STATE.players.find(p => p.id === winnerId);
    if (!targetPlayer) return;

    // 1. Update Score
    const name = targetPlayer.name;
    const currentScore = GAME_STATE.scores[name] || 0;
    GAME_STATE.scores[name] = currentScore + 10; // Fixed +10 for now

    // 2. Set Winner
    GAME_STATE.roundWinnerId = winnerId;

    // 3. End Round Immediately
    broadcastState();
    io.emit("score_animate", { playerId: winnerId, amount: 10 });

    // Short delay to let animation play before showing result?
    // Or immediate. User asked for "Confirm -> End".
    endRound();
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
        // Force next round immediately if drawer leaves mid-game
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
