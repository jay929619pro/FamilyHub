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
const { players, currentDrawerId, currentWord, scores, status, timeLeft, roundWinnerId } = storeToRefs(gameStore);
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

// Settings State - Removed
// const showSettings = ref(false);
// const categories = ...

// ... existing code ...

// function setCategory(cat) { ... } // Removed

const isDrawer = computed(() => {
  // Debug log to trace why drawer is missing
  // console.log(`Check Drawer: MySocket=${socketId.value}, CurrentDrawer=${currentDrawerId.value}`);
  return socketId.value && currentDrawerId.value === socketId.value;
});

const wordWithPinyin = computed(() => {
  if (!currentWord.value) return [];
  const chars = currentWord.value.split("");
  return chars.map(char => ({
    char,
    py: pinyin(char, { type: "string", toneType: "symbol" })
  }));
});

const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => (scores.value[b.name] || 0) - (scores.value[a.name] || 0));
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

function changeWord() {
  socket.emit("change_word");
}

function claimDrawer() {
  socket.emit("claim_drawer");
}

function giveUpDrawer() {
  Dialog({
    title: "放弃作画?",
    message: "确定要让给别人画吗?",
    onConfirm: () => {
      socket.emit("give_up_drawer");
    }
  });
}

// ... existing code ...

const roundWinnerName = computed(() => {
  if (!roundWinnerId.value) return "无";
  const p = players.value.find(p => p.id === roundWinnerId.value);
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
    <!-- 1. Header -->
    <header class="h-16 grid grid-cols-3 items-center px-4 bg-white shadow-sm z-10 shrink-0 relative">
      <!-- Left: Game Info -->
      <div class="flex items-center gap-3 justify-start">
        <div
          v-if="status === 'playing'"
          class="font-mono text-xl font-bold flex items-center gap-1 transition-colors"
          :class="timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-600'"
        >
          <var-icon name="clock-outline" size="20" />
          {{ timeLeft }}s
        </div>

        <var-chip :type="isDrawer ? 'primary' : 'default'" size="small" :plain="!isDrawer">
          {{ isDrawer ? "画家" : "猜题" }}
        </var-chip>
      </div>

      <!-- Center: Word Display -->
      <div class="flex flex-col items-center justify-center">
        <template v-if="isDrawer">
          <div class="flex items-end gap-1">
            <div v-for="(item, index) in wordWithPinyin" :key="index" class="flex flex-col items-center">
              <span class="text-xs text-gray-400 font-mono">{{ item.py }}</span>
              <span class="text-2xl font-bold text-gray-800 tracking-wide leading-none">{{ item.char }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="text-gray-400 text-sm font-medium tracking-widest flex items-center gap-1">
            <span v-if="currentDrawerId" class="animate-pulse">正在作画...</span>
            <span v-else>等待开始</span>
          </div>
        </template>
      </div>

      <!-- Right: Actions (Drawer Only) -->
      <div class="flex items-center gap-2 justify-end">
        <template v-if="isDrawer">
          <var-button round text size="small" text-color="#9ca3af" @click="giveUpDrawer">
            <var-icon name="close" size="16" class="mr-1" />不画了
          </var-button>
          <var-button round size="small" type="warning" class="shadow-md" @click="changeWord">
            <var-icon name="refresh" size="16" class="mr-1" />换一题
          </var-button>
        </template>
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
      <!-- Waiting -->
      <div class="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-center backdrop-blur-sm" v-if="status === 'waiting'">
        <div class="text-6xl mb-6 animate-bounce">🎨</div>
        <h2 class="text-2xl font-bold text-gray-700 mb-2">家庭画画猜谜</h2>
        <p class="text-gray-500 mb-8">当前在线: {{ players.length }} 人</p>

        <div v-if="players.length > 0">
          <var-button
            type="success"
            size="large"
            round
            class="w-48 h-48 text-2xl font-bold shadow-xl animate-pulse border-4 border-green-200"
            @click="claimDrawer"
          >
            这局我来画 🙋‍♂️
          </var-button>
          <p class="mt-4 text-center text-gray-500 text-sm">谁想画就点这里!</p>
        </div>
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

        <div class="flex flex-col gap-4 w-48">
          <var-button block type="success" size="large" class="shadow-xl font-bold" @click="saveImage">
            <var-icon name="image-outline" class="mr-2" /> 保存画作
          </var-button>

          <var-button type="warning" size="large" class="shadow-2xl text-lg font-bold" @click="requestNewRound"> 下一局 ➡️ </var-button>
        </div>
      </div>
    </main>

    <!-- 4. Footer -->
    <footer class="h-24 bg-white flex items-center justify-center px-2 overflow-x-auto">
      <div
        v-for="p in sortedPlayers"
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

    <!-- Settings Popup Removed -->
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
