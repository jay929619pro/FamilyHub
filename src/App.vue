<script setup>
import { ref, computed, onMounted } from "vue";
import { useSocket } from "./composables/useSocket";
import { useGameStore } from "./store/game";
import { storeToRefs } from "pinia";
import { pinyin } from "pinyin-pro";
import { Dialog, Snackbar } from "@varlet/ui";
import GameBoard from "./components/GameBoard.vue";

// === 状态管理 ===
const gameStore = useGameStore();
const { players, currentDrawerId, currentWord, scores, status, timeLeft } = storeToRefs(gameStore);
const { connect, getSocket } = useSocket();
const socket = connect(); // 获取 Socket 实例

// === 本地状态 ===
const myName = ref("");
const showRoleSelect = ref(true);
const predefinedRoles = ["爸爸", "妈妈", "舅舅", "宝宝"];

// 画板相关状态
const gameBoardRef = ref(null);
const currentTool = ref("pen"); // 'pen' | 'eraser'
const currentColor = ref("#333333");
const palette = ["#333333", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

function selectColor(color) {
  currentTool.value = "pen";
  currentColor.value = color;
}

function toggleEraser() {
  currentTool.value = "eraser";
}

function confirmClear() {
  Dialog({
    title: "确认清空?",
    message: "清空后无法恢复哦",
    onConfirm: () => {
      gameBoardRef.value?.clearCanvas(true);
    }
  });
}

// === 计算属性 ===
// 是否是画手
const isDrawer = computed(() => {
  return socket?.id && currentDrawerId.value === socket.id;
});

// 带有拼音的题目 HTML (仅画手显示)
const wordWithPinyin = computed(() => {
  if (!currentWord.value) return "等待题目...";
  // 使用 pinyin-pro 生成带拼音的结构
  // result 格式示例: pín guǒ
  const py = pinyin(currentWord.value, { type: "string", toneType: "symbol" });
  return { word: currentWord.value, py };
});

// === 核心交互 ===

// 1. 选择角色并登录
function selectRole(role) {
  myName.value = role;
  showRoleSelect.value = false;

  // 发送加入游戏事件
  socket.emit("join_game", { name: role });
  Snackbar.success(`欢迎, ${role}!`);
}

// 2. 模拟开始/切题 (实际应由服务端状态控制，这里为了演示加个临时入口)
function requestNewRound() {
  if (isDrawer.value) {
    socket.emit("next_round");
  }
}

// 3. 给某人加分 (仅画手可用)
function addScore(playerId) {
  if (!isDrawer.value) return;
  socket.emit("add_score", { playerId, amount: 10 });
  Snackbar.info("加分成功! +10");
}

// === 样式配置 ===
// 不同角色的头像颜色映射 (Varlet 风格)
const roleColors = {
  爸爸: "linear-gradient(to right, #2980b9, #6dd5fa)",
  妈妈: "linear-gradient(to right, #ff9966, #ff5e62)",
  舅舅: "linear-gradient(to right, #11998e, #38ef7d)",
  宝宝: "linear-gradient(to right, #f7b733, #fc4a1a)"
};

const getAvatarColor = name => roleColors[name] || "#ccc";

onMounted(() => {
  // 简单的重连提示
  socket.on("connect", () => {
    // 如果已经选过角色，重连后可能需要重新加入
    if (myName.value) {
      socket.emit("join_game", { name: myName.value });
    }
  });
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-amber-50 overflow-hidden select-none">
    <!-- 1. 顶部栏 (题目显示) -->
    <header class="h-16 flex items-center justify-between px-4 bg-white shadow-sm z-10">
      <div class="flex flex-col justify-center">
        <!-- 仅画手能看到题目 -->
        <template v-if="isDrawer">
          <span class="text-xs text-gray-400 font-mono tracking-wide">{{ wordWithPinyin.py }}</span>
          <span class="text-xl font-bold text-gray-800 tracking-widest">{{ wordWithPinyin.word }}</span>
        </template>
        <template v-else>
          <span class="text-lg text-gray-500 font-medium">
            {{ currentDrawerId ? "猜猜他在画什么?" : "等待游戏开始" }}
          </span>
        </template>
      </div>

      <!-- 状态指示 -->
      <div class="flex items-center gap-3">
        <!-- 倒计时 -->
        <div
          v-if="status === 'playing'"
          class="font-mono text-xl font-bold flex items-center gap-1 transition-colors"
          :class="timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-600'"
        >
          <var-icon name="clock-outline" size="20" />
          {{ timeLeft }}s
        </div>

        <var-chip :type="isDrawer ? 'primary' : 'default'" size="small">
          {{ isDrawer ? "你是画家 🖌️" : "猜题中 👀" }}
        </var-chip>
      </div>
    </header>

    <!-- 游戏状态遮罩 -->
    <!-- 1. 等待开始 -->
    <div
      v-if="status === 'waiting'"
      class="absolute inset-x-0 top-16 bottom-24 bg-white/90 z-30 flex flex-col items-center justify-center backdrop-blur-sm"
    >
      <div class="text-4xl mb-4 animate-bounce">⏳</div>
      <h2 class="text-2xl font-bold text-gray-700 mb-2">等待游戏开始</h2>
      <p class="text-gray-500 mb-6">当前在线: {{ players.length }} 人</p>
      <var-button v-if="isDrawer || players.length > 0" type="primary" size="large" class="shadow-xl" @click="requestNewRound">
        开始第一局
      </var-button>
    </div>

    <!-- 2. 回合结束 -->
    <div
      v-if="status === 'result'"
      class="absolute inset-x-0 top-16 bottom-24 bg-black/60 z-30 flex flex-col items-center justify-center text-white backdrop-blur-sm"
    >
      <div class="text-6xl mb-4">🔔</div>
      <h2 class="text-3xl font-bold mb-4">时间到!</h2>
      <p class="text-xl opacity-90 mb-8">
        正确答案是: <span class="font-bold text-yellow-300 text-2xl">{{ currentWord }}</span>
      </p>

      <var-button v-if="isDrawer" type="warning" size="large" class="pulse-btn" @click="requestNewRound"> 下一局 ➡️ </var-button>
      <div v-else class="text-sm opacity-75 animate-pulse">等待画家开启下一轮...</div>
    </div>

    <!-- 2. 中间画板 (自适应高度) -->
    <main class="flex-1 w-full relative bg-white m-2 border-2 border-amber-200 rounded-xl overflow-hidden shadow-inner">
      <GameBoard
        ref="gameBoardRef"
        :is-drawer="isDrawer"
        :stroke-color="currentTool === 'eraser' ? '#ffffff' : currentColor"
        :stroke-width="currentTool === 'eraser' ? 20 : 6"
      />

      <!-- 画家专用工具栏 -->
      <template v-if="isDrawer">
        <!-- 左上：切题 -->
        <div class="absolute top-2 left-2 opacity-80 z-20">
          <var-button round size="mini" type="warning" @click="requestNewRound">换一题</var-button>
        </div>

        <!-- 右下：绘图工具 (颜色 + 操作) -->
        <div class="absolute bottom-4 left-0 w-full flex justify-center items-center gap-3 z-20 pointer-events-none">
          <div
            class="bg-white/90 backdrop-blur rounded-full shadow-lg p-2 flex items-center gap-3 pointer-events-auto border border-gray-100"
          >
            <!-- 颜色选择 -->
            <div
              v-for="color in palette"
              :key="color"
              class="w-6 h-6 rounded-full border-2 cursor-pointer transition-transform active:scale-90"
              :class="[currentColor === color && currentTool === 'pen' ? 'border-gray-600 scale-110' : 'border-transparent', 'shadow-sm']"
              :style="{ background: color }"
              @click="selectColor(color)"
            ></div>

            <div class="w-px h-6 bg-gray-200 mx-1"></div>

            <!-- 橡皮擦 -->
            <var-button round size="small" :type="currentTool === 'eraser' ? 'primary' : 'default'" @click="toggleEraser">
              <var-icon name="eraser" size="16" />
            </var-button>

            <!-- 清空 -->
            <var-button round size="small" type="danger" text @click="confirmClear">
              <var-icon name="trash-can-outline" size="20" />
            </var-button>
          </div>
        </div>
      </template>
    </main>

    <!-- 3. 底部成员列表 (加分控制) -->
    <footer class="h-24 bg-white border-t border-amber-100 flex items-center px-2 overflow-x-auto gap-3">
      <transition-group name="list" tag="div" class="flex gap-3 w-full px-2">
        <div v-for="p in players" :key="p.id" class="flex flex-col items-center min-w-[60px] relative transition-all">
          <!-- 头像 -->
          <div class="relative">
            <var-avatar
              size="large"
              :style="{ background: getAvatarColor(p.name) }"
              class="border-2 border-white shadow-md font-bold text-white text-sm"
            >
              {{ p.name }}
            </var-avatar>

            <!-- 当前画手标识小图标 -->
            <div
              v-if="p.id === currentDrawerId"
              class="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-[2px] shadow-sm animate-bounce"
            >
              🖌️
            </div>
          </div>

          <!-- 分数 & 名字 -->
          <div class="text-center mt-1 leading-tight">
            <div class="text-[10px] text-gray-400">{{ p.name }}</div>
            <div class="font-bold text-amber-600 font-mono">{{ scores[p.id] || 0 }}</div>
          </div>

          <!-- 画家特权：加分按钮 (不可以给自己加) -->
          <div v-if="isDrawer && p.id !== socket.id" class="absolute -top-4 w-full flex justify-center">
            <var-button round color="#ff9f43" text-color="#fff" size="mini" elevation="2" @click="addScore(p.id)"> +10 </var-button>
          </div>
        </div>
      </transition-group>

      <div v-if="players.length === 0" class="w-full text-center text-gray-300 text-sm">这里空空如也...</div>
    </footer>

    <!-- 4. 角色选择弹窗 (强制) -->
    <var-popup :show="showRoleSelect" :close-on-click-overlay="false" class="rounded-xl p-6 w-4/5 max-w-sm">
      <div class="text-center">
        <h3 class="text-lg font-bold text-gray-700 mb-6">我是谁?</h3>
        <div class="grid grid-cols-2 gap-4">
          <var-button
            v-for="role in predefinedRoles"
            :key="role"
            block
            size="large"
            :style="{ background: getAvatarColor(role), color: 'white' }"
            class="shadow-md"
            @click="selectRole(role)"
          >
            {{ role }}
          </var-button>
        </div>
      </div>
    </var-popup>
  </div>
</template>

<style>
/* 列表过渡动画 */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
