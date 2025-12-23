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

// ====== 简单的内存数据库 ======
const GAME_STATE = {
  players: [], // [{ id, name }]
  scores: {}, // { [id]: number }
  currentDrawerId: null,
  currentWord: "苹果" // 默认词
};

// 简单的词库
const WORD_LIST = ["苹果", "香蕉", "汽车", "房子", "小狗", "太阳", "月亮", "机器人", "西瓜", "电脑"];

// ====== 辅助函数 ======
function broadcastState() {
  io.emit("stateUpdate", {
    players: GAME_STATE.players,
    scores: GAME_STATE.scores,
    currentDrawerId: GAME_STATE.currentDrawerId,
    currentWord: GAME_STATE.currentWord
  });
}

function nextRound() {
  // 简单逻辑：随机换词
  const idx = Math.floor(Math.random() * WORD_LIST.length);
  GAME_STATE.currentWord = WORD_LIST[idx];

  // 简单轮替画手 (如果有人)
  if (GAME_STATE.players.length > 0) {
    // 找到当前画手的 index
    const currentIdx = GAME_STATE.players.findIndex(p => p.id === GAME_STATE.currentDrawerId);
    let nextIdx = (currentIdx + 1) % GAME_STATE.players.length;
    if (currentIdx === -1) nextIdx = 0; // 初始情况

    GAME_STATE.currentDrawerId = GAME_STATE.players[nextIdx].id;
  }

  // 清空画布
  io.emit("clear_canvas");
  broadcastState();
}

// ====== Socket 逻辑 ======
io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  // 1. 玩家加入
  socket.on("join_game", ({ name }) => {
    // 避免重复加入
    const existing = GAME_STATE.players.find(p => p.id === socket.id);
    if (!existing) {
      GAME_STATE.players.push({ id: socket.id, name });
      // 初始化分数
      if (GAME_STATE.scores[socket.id] === undefined) {
        GAME_STATE.scores[socket.id] = 0;
      }
    } else {
      // 更新名字
      existing.name = name;
    }

    // 如果还没有画手，第一个进来的人当画手
    if (!GAME_STATE.currentDrawerId) {
      GAME_STATE.currentDrawerId = socket.id;
    }

    broadcastState();
  });

  // 2. 也是画手主动切题
  socket.on("next_round", () => {
    if (socket.id === GAME_STATE.currentDrawerId) {
      nextRound();
    }
  });

  // 3. 绘画事件转发 (除了自己，广播给所有人)
  socket.on("draw", data => {
    socket.broadcast.emit("draw", data);
  });

  socket.on("draw_start", data => {
    socket.broadcast.emit("draw_start", data); // 可选
  });

  socket.on("draw_end", () => {
    socket.broadcast.emit("draw_end"); // 可选
  });

  socket.on("clear_canvas", () => {
    if (socket.id === GAME_STATE.currentDrawerId) {
      socket.broadcast.emit("clear_canvas");
    }
  });

  // 4. 加分逻辑
  socket.on("add_score", ({ playerId, amount }) => {
    // 简单校验：只有当前画手能给别人加分
    if (socket.id !== GAME_STATE.currentDrawerId) return;

    const currentScore = GAME_STATE.scores[playerId] || 0;
    GAME_STATE.scores[playerId] = currentScore + amount;

    // 给画手自己也加一半分作为奖励? (可选)
    // GAME_STATE.scores[socket.id] = (GAME_STATE.scores[socket.id] || 0) + 5;

    broadcastState();

    // 全局通知: 加分特效
    io.emit("score_animate", { playerId, amount });
  });

  // 5. 断开连接
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    // 移除玩家
    GAME_STATE.players = GAME_STATE.players.filter(p => p.id !== socket.id);

    // 如果走的正好是画手
    if (GAME_STATE.currentDrawerId === socket.id) {
      GAME_STATE.currentDrawerId = null;
      // 立即开启下一轮，选新画手
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
