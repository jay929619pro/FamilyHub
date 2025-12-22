import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust in production
    methods: ["GET", "POST"]
  }
});

// --- In-Memory State ---
// rooms: { [roomId]: { users: [], drawState: [] } }
// --- Game Constants ---
const PHASES = {
  LOBBY: "LOBBY",
  SELECTING: "SELECTING",
  DRAWING: "DRAWING",
  ROUND_END: "ROUND_END",
  GAME_END: "GAME_END"
};

const WORDS_POOL = ["苹果", "香蕉", "大象", "电脑", "火箭", "披萨", "吉他", "太阳", "外星人"];

// --- In-Memory State ---
// --- In-Memory State ---
const rooms = {};
const socketToUser = new Map(); // socketId -> userId

// Helper to get or create room
const getRoom = roomId => {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      id: roomId,
      users: new Map(), // socketId -> { id, name, score }
      drawState: [], // Array of line objects
      gameState: {
        phase: PHASES.LOBBY,
        drawerId: null,
        word: null,
        round: 1,
        totalRounds: 1,
        timeLeft: 0,
        wordsToSelect: []
      },
      timerInterval: null
    };
  }
  return rooms[roomId];
};

// --- Game Logic Controllers ---

function broadcastState(io, roomId) {
  const room = rooms[roomId];
  if (!room) return;

  // Don't send the secret word to everyone if drawing!
  const publicState = {
    ...room.gameState,
    word: room.gameState.phase === PHASES.DRAWING && room.gameState.word ? "???" : room.gameState.word,
    users: Array.from(room.users.values())
  };

  io.to(roomId).emit("message", {
    appId: "draw-guess",
    type: "game-state-update",
    payload: publicState
  });

  // Send secret word only to drawer
  if (room.gameState.phase === PHASES.DRAWING || room.gameState.phase === PHASES.SELECTING) {
    const drawerUser = room.users.get(room.gameState.drawerId);
    if (drawerUser && drawerUser.socketId) {
      const drawerSocket = io.sockets.sockets.get(drawerUser.socketId);
      if (drawerSocket) {
        drawerSocket.emit("message", {
          appId: "draw-guess",
          type: "secret-word",
          payload: room.gameState.word
        });
      }
    }
  }
}

function startGameLoop(io, roomId) {
  const room = rooms[roomId];
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.timerInterval = setInterval(() => {
    if (room.gameState.timeLeft > 0) {
      room.gameState.timeLeft--;

      // Optimization: Only broadcast time every second or specific checkpoints
      // For now, simple broadcast
      io.to(roomId).emit("message", {
        appId: "draw-guess",
        type: "timer-update",
        payload: room.gameState.timeLeft
      });
    } else {
      handleTimeout(io, roomId);
    }
  }, 1000);
}

function handleTimeout(io, roomId) {
  const room = rooms[roomId];
  if (room.gameState.phase === PHASES.SELECTING) {
    // Timeout selecting -> Auto select random word
    const randomWord = room.gameState.wordsToSelect[Math.floor(Math.random() * room.gameState.wordsToSelect.length)];

    room.gameState.word = randomWord;
    room.gameState.phase = PHASES.DRAWING;
    room.gameState.timeLeft = 60;

    // Notify drawer manually since broadcastState only sends to drawer if phase is already correct/setup,
    // but broadcastState does handle sending secret to drawer.
    // However, we need to ensure the drawer knows strictly.
    // Actually broadcastState calls below will handle it:
    // 1. Update state to DRAWING & word set.
    // 2. broadcastState checks if phase is DRAWING -> sends secret-word to drawer.
    broadcastState(io, roomId);
  } else if (room.gameState.phase === PHASES.DRAWING) {
    // Timeout drawing -> Round end
    endRound(io, roomId, "无人猜中");
  } else if (room.gameState.phase === PHASES.ROUND_END) {
    nextTurn(io, roomId);
  }
}

function nextTurn(io, roomId) {
  const room = rooms[roomId];
  const playerIds = Array.from(room.users.keys());

  // Find current drawer index
  let currentIndex = playerIds.indexOf(room.gameState.drawerId);
  let nextIndex = (currentIndex + 1) % playerIds.length;

  // If we cycled back to 0, increment round
  if (nextIndex === 0 && room.gameState.drawerId !== null) {
    room.gameState.round++;
  }

  if (room.gameState.round > room.gameState.totalRounds) {
    endGame(io, roomId);
    return;
  }

  // Set up Selecting Phase
  room.gameState.drawerId = playerIds[nextIndex];
  room.gameState.phase = PHASES.SELECTING;
  room.gameState.timeLeft = 5;
  room.gameState.word = null;
  room.drawState = []; // Clear board

  // Pick random words
  room.gameState.wordsToSelect = WORDS_POOL.sort(() => 0.5 - Math.random()).slice(0, 3);

  broadcastState(io, roomId);
  // Also clear client boards
  io.to(roomId).emit("message", { appId: "draw-guess", type: "clear-board" });
}

function endRound(io, roomId, reason) {
  const room = rooms[roomId];
  room.gameState.phase = PHASES.ROUND_END;
  room.gameState.timeLeft = 3; // Show result for 5s
  // Provide the answer
  io.to(roomId).emit("message", { appId: "draw-guess", type: "round-result", payload: { reason, word: room.gameState.word } });
  broadcastState(io, roomId);
}

function endGame(io, roomId) {
  const room = rooms[roomId];
  clearInterval(room.timerInterval);
  room.gameState.phase = PHASES.GAME_END;
  broadcastState(io, roomId);
}

io.on("connection", socket => {
  const userId = socket.handshake.query.userId || socket.id;
  console.log(`User connected: ${socket.id} (mapped to ${userId})`);

  // Register socket -> user mapping
  socketToUser.set(socket.id, userId);

  const DEMO_ROOM = "family-room-1";
  socket.join(DEMO_ROOM);

  const room = getRoom(DEMO_ROOM);

  // Check if user exists (Reconnection)
  let user = room.users.get(userId);
  if (user) {
    console.log(`User ${user.name} reconnected`);
    user.socketId = socket.id; // Update socket reference
    user.isOnline = true;
  } else {
    // New User
    user = {
      id: userId,
      socketId: socket.id,
      name: `User ${userId.substr(-4)}`,
      score: 0,
      avatar: "😊",
      isOnline: true
    };
    room.users.set(userId, user);
  }

  // Send initial state
  socket.emit("message", {
    appId: "draw-guess",
    type: "sync-state",
    payload: room.drawState
  });
  broadcastState(io, DEMO_ROOM);

  socket.on("action", ({ appId, type, payload }) => {
    if (appId !== "draw-guess") return;

    // Resolve Actor
    const actorId = socketToUser.get(socket.id);
    const actor = room.users.get(actorId);
    if (!actor) return;

    // --- Game Actions ---

    if (type === "game-start") {
      if (room.gameState.phase === PHASES.LOBBY || room.gameState.phase === PHASES.GAME_END) {
        room.gameState.round = 1;
        // Reset scores
        room.users.forEach(u => (u.score = 0));
        room.gameState.drawerId = null;
        startGameLoop(io, DEMO_ROOM);
        nextTurn(io, DEMO_ROOM);
      }
    } else if (type === "select-word") {
      if (actorId === room.gameState.drawerId && room.gameState.phase === PHASES.SELECTING) {
        room.gameState.word = payload.word;
        room.gameState.phase = PHASES.DRAWING;
        room.gameState.timeLeft = 60;
        broadcastState(io, DEMO_ROOM);
      }
    } else if (type === "guess") {
      if (room.gameState.phase === PHASES.DRAWING && actorId !== room.gameState.drawerId) {
        const guess = payload.text;
        if (guess === room.gameState.word) {
          // Correct!
          const drawer = room.users.get(room.gameState.drawerId);

          // Simple scoring
          actor.score += 10;
          if (drawer) drawer.score += 5;

          endRound(io, DEMO_ROOM, `${actor.name} 猜对了！`);
        } else {
          // Forward incorrect guess to chat
          io.to(DEMO_ROOM).emit("message", {
            appId: "draw-guess",
            type: "chat-message",
            payload: { from: actor.name, text: guess }
          });
        }
      }
    }

    // --- Profile Actions ---
    else if (type === "update-profile") {
      actor.name = payload.name;
      actor.avatar = payload.avatar;
      broadcastState(io, DEMO_ROOM);
    }

    // --- Drawing Actions (Only allowed if Drawing Phase & Correct Drawer) ---
    else if (["draw-start", "draw-move", "draw-end"].includes(type)) {
      if (room.gameState.phase === PHASES.DRAWING && actorId === room.gameState.drawerId) {
        if (type === "draw-start") room.drawState.push(payload);
        else if (type === "draw-move") {
          const line = room.drawState.find(l => l.id === payload.id);
          if (line) line.points.push(payload.point.x, payload.point.y);
        }
        socket.to(DEMO_ROOM).emit("message", { appId, type, payload });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const userId = socketToUser.get(socket.id);
    socketToUser.delete(socket.id);

    if (rooms[DEMO_ROOM] && userId) {
      const room = rooms[DEMO_ROOM];
      const user = room.users.get(userId);
      if (user) user.isOnline = false;

      const wasDrawer = userId === room.gameState.drawerId;

      // Do NOT delete user from room to enable reconnect
      // room.users.delete(userId);

      // Handle drawer disconnect
      if (wasDrawer) {
        if (room.gameState.phase === PHASES.DRAWING) {
          endRound(io, DEMO_ROOM, "画师溜走了...");
        } else if (room.gameState.phase === PHASES.SELECTING) {
          nextTurn(io, DEMO_ROOM);
        }
      }

      broadcastState(io, DEMO_ROOM);
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
