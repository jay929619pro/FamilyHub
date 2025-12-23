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
const { players, currentDrawerId, currentWord, scores, status, timeLeft } = storeToRefs(gameStore);
const { connect } = useSocket();
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

// === Computed ===

const isDrawer = computed(() => socket?.id && currentDrawerId.value === socket.id);

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
  // Simple sort descending
  return [...players.value].sort((a, b) => (scores.value[b.id] || 0) - (scores.value[a.id] || 0))[0];
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

function addScore(playerId) {
  if (!isDrawer.value) return;
  socket.emit("add_score", { playerId, amount: 10 });
  Snackbar.info("加分成功! +10");
}

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
  // Prevent stacking
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

// Watch Game Status to trigger Effects
watch(status, (newVal, oldVal) => {
  if (newVal === "playing" && oldVal !== "playing") {
    // Round Start: Speak word if drawer
    if (isDrawer.value) {
      speak(`你要画的是：${currentWord.value}`);
    }
  } else if (newVal === "result") {
    // Round End
  }
});

// Watch Drawer assignment (late join / reassign)
watch(isDrawer, newVal => {
  if (newVal && status.value === "playing") {
    speak(`你要画的是：${currentWord.value}`);
  }
});

// === Lifecycle ===

onMounted(() => {
  socket.on("connect", () => {
    // Auto-rejoin if we have a name
    if (myName.value) {
      socket.emit("join_game", { name: myName.value });
    }
  });

  // Listen for score animation
  socket.on("score_animate", ({ playerId }) => {
    scoreEffects.value[playerId] = true;
    setTimeout(() => {
      scoreEffects.value[playerId] = false;
    }, 1000);
  });
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-amber-50 overflow-hidden select-none">
    <!-- 1. Header -->
    <header class="h-16 flex items-center justify-between px-4 bg-white shadow-sm z-10 shrink-0">
      <div class="flex flex-col justify-center">
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

      <div class="flex items-center gap-3">
        <!-- Timer Display -->
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
    <main class="flex-1 w-full relative bg-white m-2 border-2 border-amber-200 rounded-xl overflow-hidden shadow-inner">
      <GameBoard
        ref="gameBoardRef"
        :is-drawer="isDrawer"
        :disabled="status !== 'playing'"
        :stroke-color="currentTool === 'eraser' ? '#ffffff' : currentColor"
        :stroke-width="currentTool === 'eraser' ? 20 : 6"
      />

      <!-- Drawer Toolbar -->
      <template v-if="isDrawer">
        <!-- Next Round Button (Floating) -->
        <div class="absolute top-2 left-2 opacity-80 z-20">
          <var-button round size="mini" type="warning" @click="requestNewRound">换一题</var-button>
        </div>

        <!-- Drawing Tools (Bottom Floating) -->
        <div class="absolute bottom-4 left-0 w-full flex justify-center items-center gap-3 z-20 pointer-events-none">
          <div
            class="bg-white/95 backdrop-blur rounded-full shadow-lg p-2 flex items-center gap-3 pointer-events-auto border border-amber-100"
          >
            <!-- Palette -->
            <div
              v-for="color in palette"
              :key="color"
              class="w-6 h-6 rounded-full border-2 cursor-pointer transition-transform active:scale-95"
              :class="[currentColor === color && currentTool === 'pen' ? 'border-gray-600 scale-110' : 'border-transparent shadow-sm']"
              :style="{ background: color }"
              @click="selectColor(color)"
            ></div>
            <div class="w-px h-6 bg-gray-200 mx-1"></div>
            <!-- Actions -->
            <var-button round size="small" :type="currentTool === 'eraser' ? 'primary' : 'default'" @click="toggleEraser">
              <var-icon name="eraser" size="16" />
            </var-button>
            <var-button round size="small" type="danger" text @click="confirmClear">
              <var-icon name="trash-can-outline" size="20" />
            </var-button>
          </div>
        </div>
      </template>
    </main>

    <!-- 3. Overlays (Z-Index 30) -->

    <!-- Waiting Overlay -->
    <div
      v-if="status === 'waiting'"
      class="absolute inset-0 top-16 bottom-24 bg-white/95 z-30 flex flex-col items-center justify-center backdrop-blur-sm"
    >
      <div class="text-6xl mb-6 animate-bounce">🎨</div>
      <h2 class="text-2xl font-bold text-gray-700 mb-2">家庭画画猜谜</h2>
      <p class="text-gray-500 mb-8">当前在线: {{ players.length }} 人</p>

      <var-button v-if="players.length > 0" type="primary" size="large" class="w-48 shadow-xl text-lg font-bold" @click="requestNewRound">
        开始游戏
      </var-button>
    </div>

    <!-- Result Overlay -->
    <div
      v-if="status === 'result'"
      class="absolute inset-0 top-16 bottom-24 bg-black/80 z-30 flex flex-col items-center justify-center text-white backdrop-blur-md"
    >
      <div class="text-6xl mb-4 animate-pulse">⏰</div>
      <h2 class="text-3xl font-bold mb-6 tracking-wider">时间到!</h2>

      <div class="mb-8 text-center">
        <p class="text-gray-300 text-sm mb-1">正确答案</p>
        <p class="text-4xl font-bold text-yellow-400 tracking-[0.2em]">{{ currentWord }}</p>
      </div>

      <!-- Winner Spotlight -->
      <div v-if="topPlayer" class="flex gap-2 items-center bg-white/10 px-4 py-2 rounded-lg mb-8">
        <span class="text-xs text-gray-300">目前领先:</span>
        <var-avatar size="small" :style="{ background: getAvatarColor(topPlayer.name) }">{{ topPlayer.name }}</var-avatar>
        <span class="font-bold text-yellow-400">{{ scores[topPlayer.id] || 0 }}分</span>
      </div>

      <!-- STRICT PERMISSION: Only drawer can start next round -->
      <var-button v-if="isDrawer" type="warning" size="large" class="w-48 shadow-2xl text-lg font-bold" @click="requestNewRound">
        下一局 ➡️
      </var-button>
      <div v-else class="text-sm opacity-75 animate-pulse">等待画家开启下一轮...</div>
    </div>

    <!-- 4. Footer (Players) -->
    <footer class="h-24 bg-white border-t border-amber-100 flex items-center px-2 overflow-x-auto gap-3 shrink-0">
      <transition-group name="list" tag="div" class="flex gap-3 w-full px-2">
        <div v-for="p in players" :key="p.id" class="flex flex-col items-center min-w-[60px] relative transition-all">
          <div class="relative transition-transform duration-300" :class="{ 'scale-125 z-20': scoreEffects[p.id] }">
            <var-avatar
              size="large"
              :style="{ background: getAvatarColor(p.name) }"
              class="border-2 border-white shadow-md font-bold text-white text-sm transition-all"
              :class="{ 'ring-4 ring-yellow-400': scoreEffects[p.id] }"
            >
              {{ p.name }}
            </var-avatar>
            <!-- +10 Floating Text -->
            <div
              v-if="scoreEffects[p.id]"
              class="absolute -top-8 left-0 w-full text-center text-yellow-500 font-bold text-xl animate-bounce pointer-events-none"
            >
              +10
            </div>
            <div
              v-if="p.id === currentDrawerId"
              class="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-[2px] shadow-sm animate-bounce text-xs"
            >
              🖌️
            </div>
          </div>
          <div class="text-center mt-1 leading-tight">
            <div class="text-[10px] text-gray-400">{{ p.name }}</div>
            <div class="font-bold text-amber-600 font-mono">{{ scores[p.id] || 0 }}</div>
          </div>
          <!-- Add Score Button -->
          <div v-if="isDrawer && p.id !== socket.id" class="absolute -top-5 w-full flex justify-center transform scale-90">
            <var-button round color="#ff9f43" text-color="#fff" size="mini" elevation="2" @click="addScore(p.id)">+10</var-button>
          </div>
        </div>
      </transition-group>
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
