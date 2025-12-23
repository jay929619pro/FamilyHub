<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useSocket } from "./composables/useSocket";
import { useGameStore } from "./store/game";
import { storeToRefs } from "pinia";
import { pinyin } from "pinyin-pro";
import { Dialog, Snackbar } from "@varlet/ui";
import GameBoard from "./components/GameBoard.vue";

// === State Management ===
const gameStore = useGameStore();
const { players, currentDrawerId, currentWord, scores, status, timeLeft, category, roundWinnerId, nextDrawerId } = storeToRefs(gameStore);
const { connect, socketId } = useSocket(); // Use reactive socketId
const socket = connect();

// === Local State ===
const myName = ref(localStorage.getItem("family_hub_name") || "");
const showRoleSelect = ref(!myName.value);
const predefinedRoles = ["爸爸", "妈妈", "舅舅", "宝宝"];

// Drawing Tools
const gameBoardRef = ref(null);
const currentTool = ref("pen"); // 'pen' | 'eraser'
const currentColor = ref("#333333");
const palette = ["#333333", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

// Animation State
const scoreEffects = ref({}); // { [playerId]: boolean }

// Settings State
const showSettings = ref(false);
const categories = [
  { key: "kids", label: "宝宝模式 (简单)" },
  { key: "family", label: "家庭模式 (生活)" },
  { key: "pro", label: "成语模式 (困难)" }
];

// === Computed ===

const isDrawer = computed(() => {
  // Debug log to trace why drawer is missing
  // console.log(`Check Drawer: MySocket=${socketId.value}, CurrentDrawer=${currentDrawerId.value}`);
  return socketId.value && currentDrawerId.value === socketId.value;
});

// Pinyin Generation
const wordWithPinyin = computed(() => {
  if (!currentWord.value) return { word: "...", py: "" };
  const py = pinyin(currentWord.value, { type: "string", toneType: "symbol" });
  return { word: currentWord.value, py };
});

// Avatar Colors
const roleColors = {
  爸爸: "linear-gradient(to right, #2980b9, #6dd5fa)",
  妈妈: "linear-gradient(to right, #ff9966, #ff5e62)",
  舅舅: "linear-gradient(to right, #11998e, #38ef7d)",
  宝宝: "linear-gradient(to right, #f7b733, #fc4a1a)"
};
const getAvatarColor = name => roleColors[name] || "#ccc";

// Highest Score Player (for Result Screen)
const topPlayer = computed(() => {
  if (players.value.length === 0) return null;
  return [...players.value].sort((a, b) => (scores.value[b.name] || 0) - (scores.value[a.name] || 0))[0];
});

// === Actions ===

function selectRole(role) {
  myName.value = role;
  localStorage.setItem("family_hub_name", role);
  showRoleSelect.value = false;
  socket.emit("join_game", { name: role });
  Snackbar.success(`欢迎, ${role}!`);
}

function requestNewRound() {
  socket.emit("next_round");
}

function setCategory(cat) {
  socket.emit("set_category", cat);
  Snackbar.success(`已切换题库: ${categories.find(c => c.key === cat).label}`);
  showSettings.value = false;
}

// ... existing code ...

const roundWinnerName = computed(() => {
  if (!roundWinnerId.value) return "无";
  const p = players.value.find(p => p.id === roundWinnerId.value);
  return p ? p.name : "未知";
});

const nextDrawerName = computed(() => {
  if (!nextDrawerId.value) return "???";
  const p = players.value.find(p => p.id === nextDrawerId.value);
  return p ? p.name : "未知";
});

// ... existing code ...

function handleAvatarClick(player) {
  // Only drawer can select winner, and can't select self
  if (!isDrawer.value) return;
  if (player.id === socketId.value) return;
  if (status.value !== "playing") return;

  Dialog({
    title: "确认正确?",
    message: `确认 ${player.name} 猜对了吗? \n确认后本局将结束。`,
    onConfirm: () => {
      socket.emit("drawer_confirm_winner", { winnerId: player.id });
      Snackbar.success("已确认获胜者!");
    }
  });
}

function saveImage() {
  gameBoardRef.value?.saveImage();
  Snackbar.success("正在保存画作...");
}

// Removed old addScore
// function addScore(playerId) { ... }

// Tool Handlers
function selectColor(color) {
  currentTool.value = "pen";
  currentColor.value = color;
}
function toggleEraser() {
  currentTool.value = "eraser";
}
function confirmClear() {
  Dialog({ title: "确认清空?", message: "清空后无法恢复哦", onConfirm: () => gameBoardRef.value?.clearCanvas(true) });
}

// === Watchers & Effects ===

// TTS Voice Service
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

// Watch Game Status
watch(status, (newVal, oldVal) => {
  if (newVal === "playing" && oldVal !== "playing") {
    if (isDrawer.value) {
      speak(`你要画的是：${currentWord.value}`);
    }
  }
});

watch(isDrawer, newVal => {
  if (newVal && status.value === "playing") {
    speak(`你要画的是：${currentWord.value}`);
  }
});

// === Lifecycle ===

onMounted(() => {
  socket.on("connect", () => {
    if (myName.value) {
      // Re-join logic: requires validation again?
      // Actually if connection drops, server clears player.
      // So we just try to join. If taken (by someone else?), server errors.
      socket.emit("join_game", { name: myName.value });
    }
  });

  socket.on("error_msg", msg => {
    Snackbar.warning(msg);
    // If join failed, maybe show selector again?
    // But simplistic for now: just toast.
    if (msg.includes("已被占用")) {
      myName.value = "";
      localStorage.removeItem("family_hub_name");
      showRoleSelect.value = true;
    }
  });

  socket.on("score_animate", ({ playerId }) => {
    scoreEffects.value[playerId] = true;
    setTimeout(() => {
      scoreEffects.value[playerId] = false;
    }, 1000);
  });

  socket.on("sync_history", history => {
    gameBoardRef.value?.replayHistory(history);
  });

  // Wake Lock
  let wakeLock = null;
  const requestWakeLock = async () => {
    if ("wakeLock" in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch (err) {
        console.error("Wake Lock error:", err);
      }
    }
  };
  requestWakeLock();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") requestWakeLock();
  });
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-amber-50 overflow-hidden select-none">
    <!-- 1. Header -->
    <header class="h-16 flex items-center justify-between px-4 bg-white shadow-sm z-10 shrink-0">
      <div class="flex items-center gap-2">
        <!-- Settings Button -->
        <var-button round text @click="showSettings = true">
          <var-icon name="cog-outline" size="24" class="text-gray-600" />
        </var-button>

        <div class="flex flex-col justify-center ml-2">
          <template v-if="isDrawer">
            <span class="text-xs text-gray-400 font-mono tracking-wide">{{ wordWithPinyin.py }}</span>
            <span class="text-xl font-bold text-gray-800 tracking-widest">{{ wordWithPinyin.word }}</span>
          </template>
          <template v-else>
            <span class="text-lg text-gray-500 font-medium tracking-wide">
              {{ currentDrawerId ? "猜猜他在画什么?" : "等待游戏开始" }}
            </span>
          </template>
        </div>
      </div>

      <div class="flex items-center gap-3">
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

    <!-- 2. Main Game Board -->
    <main class="flex-1 w-full relative bg-white border-t-2 border-b-2 border-amber-200 overflow-hidden shadow-inner pb-20">
      <GameBoard
        ref="gameBoardRef"
        :is-drawer="isDrawer"
        :disabled="status !== 'playing'"
        :stroke-color="currentTool === 'eraser' ? '#ffffff' : currentColor"
        :stroke-width="currentTool === 'eraser' ? 60 : 6"
      />

      <!-- Drawer Toolbar -->
      <template v-if="isDrawer">
        <!-- Next Round Button -->
        <div class="absolute top-2 left-2 opacity-80 z-20">
          <var-button round size="mini" type="warning" @click="requestNewRound">换一题</var-button>
        </div>

        <!-- Drawing Tools -->
        <div class="absolute bottom-4 left-0 w-full flex justify-center items-center gap-3 z-20 pointer-events-none">
          <div
            class="bg-white/95 backdrop-blur rounded-full shadow-lg p-2 flex items-center gap-3 pointer-events-auto border border-amber-100"
          >
            <div
              v-for="color in palette"
              :key="color"
              class="w-6 h-6 rounded-full border-2 cursor-pointer transition-transform active:scale-95"
              :class="[currentColor === color && currentTool === 'pen' ? 'border-gray-600 scale-110' : 'border-transparent shadow-sm']"
              :style="{ background: color }"
              @click="selectColor(color)"
            ></div>
            <div class="w-px h-6 bg-gray-200 mx-1"></div>
            <var-button round size="small" :type="currentTool === 'eraser' ? 'primary' : 'default'" @click="toggleEraser">
              <var-icon name="eraser" size="16" />
            </var-button>
            <var-button round size="small" type="danger" text @click="confirmClear">
              <var-icon name="trash-can-outline" size="20" />
            </var-button>
          </div>
        </div>
      </template>

      <!-- 3. Overlays -->
      <!-- Waiting -->
      <div class="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-center backdrop-blur-sm" v-if="status === 'waiting'">
        <div class="text-6xl mb-6 animate-bounce">🎨</div>
        <h2 class="text-2xl font-bold text-gray-700 mb-2">家庭画画猜谜</h2>
        <p class="text-gray-500 mb-8">当前在线: {{ players.length }} 人</p>
        <var-button v-if="players.length > 0" type="primary" size="large" class="w-48 shadow-xl text-lg font-bold" @click="requestNewRound">
          开始游戏
        </var-button>
      </div>

      <!-- Result -->
      <div
        v-if="status === 'result'"
        class="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center text-white backdrop-blur-md"
      >
        <div class="text-6xl mb-4 animate-pulse">⏰</div>
        <h2 class="text-3xl font-bold mb-6 tracking-wider">时间到!</h2>

        <div class="mb-8 text-center">
          <p class="text-gray-300 text-sm mb-1">正确答案</p>
          <p class="text-4xl font-bold text-yellow-400 tracking-[0.2em]">{{ currentWord }}</p>
        </div>

        <div class="mb-4 text-center">
          <p class="text-gray-300 text-sm mb-1">🎉 本局获胜</p>
          <div class="flex items-center justify-center gap-2">
            <var-avatar size="small" :style="{ background: getAvatarColor(roundWinnerName) }">{{ roundWinnerName }}</var-avatar>
          </div>
        </div>

        <div class="mb-8 text-center bg-white/10 px-6 py-2 rounded-lg">
          <p class="text-gray-300 text-xs mb-1">下一位画家</p>
          <div class="flex items-center justify-center gap-2">
            <var-avatar size="mini" :style="{ background: getAvatarColor(nextDrawerName) }">{{ nextDrawerName }}</var-avatar>
          </div>
        </div>

        <div class="flex flex-col gap-4 w-48">
          <var-button block type="success" size="large" class="shadow-xl font-bold" @click="saveImage">
            <var-icon name="image-outline" class="mr-2" /> 保存画作
          </var-button>

          <var-button v-if="isDrawer" type="warning" size="large" class="shadow-2xl text-lg font-bold" @click="requestNewRound">
            下一局 ➡️
          </var-button>
          <div v-else class="text-center text-sm opacity-75 animate-pulse">等待画家开启下一轮...</div>
        </div>
      </div>
    </main>

    <!-- 4. Footer -->
    <footer class="h-24 bg-white flex items-center justify-center px-2 overflow-x-auto">
      <div
        v-for="p in players"
        :key="p.id"
        class="flex-1 h-full min-w-[60px] flex flex-col items-center justify-center relative transition-all cursor-pointer hover:bg-amber-50 rounded-lg"
        @click="handleAvatarClick(p)"
      >
        <div class="relative transition-transform duration-300" :class="{ 'scale-125 z-20': scoreEffects[p.id] }">
          <var-avatar
            :style="{ background: getAvatarColor(p.name) }"
            class="w-10 h-10 border-2 border-white shadow-md font-bold text-white text-xs transition-all"
            :class="{ 'ring-4 ring-yellow-400': scoreEffects[p.id] }"
          >
            {{ p.name }}
          </var-avatar>
          <div
            v-if="p.id === currentDrawerId"
            class="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-[2px] shadow-sm animate-bounce text-xs"
          >
            🖌️
          </div>
        </div>
        <div class="font-bold text-amber-600 font-mono">{{ scores[p.name] || 0 }}</div>
      </div>
      <div v-if="players.length === 0" class="w-full text-center text-gray-300 text-sm">Waiting for players...</div>
    </footer>

    <!-- Role Select Popup -->
    <var-popup :show="showRoleSelect" :close-on-click-overlay="false" class="rounded-xl p-6 w-4/5 max-w-sm">
      <div class="text-center">
        <h3 class="text-lg font-bold text-gray-700 mb-6">我是谁?</h3>
        <div class="grid grid-cols-2 gap-4">
          <var-button
            v-for="role in predefinedRoles"
            :key="role"
            block
            size="large"
            :disabled="players.some(p => p.name === role)"
            :style="{
              background: players.some(p => p.name === role) ? '#e5e7eb' : getAvatarColor(role),
              color: players.some(p => p.name === role) ? '#9ca3af' : 'white'
            }"
            class="shadow-md transition-all"
            @click="selectRole(role)"
          >
            {{ role }}
          </var-button>
        </div>
      </div>
    </var-popup>

    <!-- Settings Popup -->
    <var-popup :show="showSettings" position="bottom" class="rounded-t-xl" @click-overlay="showSettings = false">
      <div class="p-6 bg-white">
        <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">游戏设置</h3>
        <div class="space-y-4">
          <div>
            <div class="text-sm text-gray-500 mb-2">选择题库类别</div>
            <div class="grid grid-cols-1 gap-3">
              <var-button
                v-for="cat in categories"
                :key="cat.key"
                block
                :type="category === cat.key ? 'primary' : 'default'"
                @click="setCategory(cat.key)"
              >
                {{ cat.label }}
              </var-button>
            </div>
          </div>
        </div>
        <div class="mt-6">
          <var-button block text @click="showSettings = false">关闭</var-button>
        </div>
      </div>
    </var-popup>
  </div>
</template>

<style>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
