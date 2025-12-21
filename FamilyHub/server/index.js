import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

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
  LOBBY: 'LOBBY',
  SELECTING: 'SELECTING',
  DRAWING: 'DRAWING',
  ROUND_END: 'ROUND_END',
  GAME_END: 'GAME_END'
};

const WORDS_POOL = ["苹果", "香蕉", "大象", "电脑", "火箭", "披萨", "吉他", "太阳", "外星人"];

// --- In-Memory State ---
const rooms = {};

// Helper to get or create room
const getRoom = (roomId) => {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      id: roomId,
      users: new Map(), // socketId -> { id, name, score }
      drawState: [],    // Array of line objects
      gameState: {
        phase: PHASES.LOBBY,
        drawerId: null,
        word: null,
        round: 1,
        totalRounds: 3,
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
    word: room.gameState.phase === PHASES.DRAWING && room.gameState.word ? '???' : room.gameState.word,
    users: Array.from(room.users.values())
  };

  io.to(roomId).emit('message', {
    appId: 'draw-guess',
    type: 'game-state-update',
    payload: publicState
  });
  
  // Send secret word only to drawer
  if (room.gameState.phase === PHASES.DRAWING || room.gameState.phase === PHASES.SELECTING) {
     const drawerSocket = io.sockets.sockets.get(room.gameState.drawerId);
     if (drawerSocket) {
        drawerSocket.emit('message', {
            appId: 'draw-guess',
            type: 'secret-word',
            payload: room.gameState.word
        });
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
      io.to(roomId).emit('message', {
        appId: 'draw-guess',
        type: 'timer-update',
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
    // Timeout selecting -> Auto select or skip
    // For MVP: Skip to next player
    nextTurn(io, roomId);
  } else if (room.gameState.phase === PHASES.DRAWING) {
    // Timeout drawing -> Round end
    endRound(io, roomId, '无人猜中');
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
  room.gameState.timeLeft = 15;
  room.gameState.word = null;
  room.drawState = []; // Clear board
  
  // Pick random words
  room.gameState.wordsToSelect = WORDS_POOL.sort(() => 0.5 - Math.random()).slice(0, 3);
  
  broadcastState(io, roomId);
  // Also clear client boards
  io.to(roomId).emit('message', { appId: 'draw-guess', type: 'clear-board' });
}

function endRound(io, roomId, reason) {
    const room = rooms[roomId];
    room.gameState.phase = PHASES.ROUND_END;
    room.gameState.timeLeft = 5; // Show result for 5s
    // Provide the answer
    io.to(roomId).emit('message', { appId: 'draw-guess', type: 'round-result', payload: { reason, word: room.gameState.word } });
    broadcastState(io, roomId);
}

function endGame(io, roomId) {
    const room = rooms[roomId];
    clearInterval(room.timerInterval);
    room.gameState.phase = PHASES.GAME_END;
    broadcastState(io, roomId);
}


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  const DEMO_ROOM = 'family-room-1';
  socket.join(DEMO_ROOM);
  
  const room = getRoom(DEMO_ROOM);
  // Default user setup
  room.users.set(socket.id, { 
      id: socket.id, 
      name: `User ${socket.id.substr(0,4)}`, 
      score: 0 
  });
  
  // Send initial state
  socket.emit('message', {
     appId: 'draw-guess',
     type: 'sync-state',
     payload: room.drawState
  });
  broadcastState(io, DEMO_ROOM);

  socket.on('action', ({ appId, type, payload }) => {
    if (appId !== 'draw-guess') return;
    
    // --- Game Actions ---
    
    if (type === 'game-start') {
        if (room.gameState.phase === PHASES.LOBBY || room.gameState.phase === PHASES.GAME_END) {
            room.gameState.round = 1;
            // Reset scores
            room.users.forEach(u => u.score = 0);
            room.gameState.drawerId = null; // nextTurn will set it
            startGameLoop(io, DEMO_ROOM);
            nextTurn(io, DEMO_ROOM);
        }
    }
    
    else if (type === 'select-word') {
        if (socket.id === room.gameState.drawerId && room.gameState.phase === PHASES.SELECTING) {
            room.gameState.word = payload.word;
            room.gameState.phase = PHASES.DRAWING;
            room.gameState.timeLeft = 60;
            broadcastState(io, DEMO_ROOM);
        }
    }
    
    else if (type === 'guess') {
        if (room.gameState.phase === PHASES.DRAWING && socket.id !== room.gameState.drawerId) {
            const guess = payload.text;
            if (guess === room.gameState.word) {
                 // Correct!
                 const user = room.users.get(socket.id);
                 const drawer = room.users.get(room.gameState.drawerId);
                 
                 // Simple scoring
                 if(user) user.score += 10;
                 if(drawer) drawer.score += 5;
                 
                 endRound(io, DEMO_ROOM, `${user.name} 猜对了！`);
            } else {
                 // Forward incorrect guess to chat
                 io.to(DEMO_ROOM).emit('message', {
                     appId: 'draw-guess',
                     type: 'chat-message',
                     payload: { from: room.users.get(socket.id).name, text: guess }
                 });
            }
        }
    }

    // --- Drawing Actions (Only allowed if Drawing Phase & Correct Drawer) ---
    else if (['draw-start', 'draw-move', 'draw-end'].includes(type)) {
        if (room.gameState.phase === PHASES.DRAWING && socket.id === room.gameState.drawerId) {
             if (type === 'draw-start') room.drawState.push(payload);
             else if (type === 'draw-move') {
                const line = room.drawState.find(l => l.id === payload.id);
                if (line) line.points.push(payload.point.x, payload.point.y);
             }
             socket.to(DEMO_ROOM).emit('message', { appId, type, payload });
        }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (rooms[DEMO_ROOM]) {
       const room = rooms[DEMO_ROOM];
       room.users.delete(socket.id);
       broadcastState(io, DEMO_ROOM);
       
       // Handle drawer disconnect logic if needed (skip turn)
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
