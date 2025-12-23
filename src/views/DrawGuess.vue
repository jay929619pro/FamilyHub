<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useSocket } from "../composables/useSocket";
import { useGameStore } from "../store/game";
import { storeToRefs } from "pinia";
import { pinyin } from "pinyin-pro";
import { Dialog, Snackbar } from "@varlet/ui";
import GameBoard from "../components/GameBoard.vue";

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

// Color mapping for avatars
const roleColors = {
  爸爸: "linear-gradient(to right, #2980b9, #6dd5fa)",
  妈妈: "linear-gradient(to right, #ff9966, #ff5e62)",
  舅舅: "linear-gradient(to right, #11998e, #38ef7d)",
  宝宝: "linear-gradient(to right, #f7b733, #fc4a1a)"
};
const getAvatarColor = name => roleColors[name] || "#ccc";

// Computed
const isDrawer = computed(() => socketId.value && currentDrawerId.value === socketId.value);

const currentDrawerName = computed(() => {
  if (!currentDrawerId.value) return "未知";
  const p = players.value.find(p => p.id === currentDrawerId.value);
  return p ? p.name : "家人";
});

const wordWithPinyin = computed(() => {
  if (!currentWord.value) return [];
  const chars = currentWord.value.split("");
  return chars.map(char => ({
    char,
    py: pinyin(char, { type: "string", toneType: "symbol" })
  }));
});

const maxScore = computed(() => {
  if (!players.value.length) return 0;
  const vals = players.value.map(p => scores.value[p.name] || 0);
  return Math.max(0, ...vals);
});

const sortedPlayers = computed(() => {
  return [...players.value]
    .filter(p => p.id !== currentDrawerId.value)
    .sort((a, b) => {
      // Score Descending
      return (scores.value[b.name] || 0) - (scores.value[a.name] || 0);
    });
});

// Actions
function selectRole(role) {
  myName.value = role;
  localStorage.setItem("family_hub_name", role);
  showRoleSelect.value = false;
  socket.emit("join_game", { name: role });
  Snackbar.success(`欢迎, ${role}!`);
}

function changeWord() {
  socket.emit("change_word");
}

function claimDrawer() {
  socket.emit("claim_drawer");
}

function giveUpDrawer() {
  Dialog({
    title: "🎨 结束作画",
    message: "确定要交出画笔，让下一位家人来画吗？",
    confirmButtonText: "确认换人",
    cancelButtonText: "继续作画",
    confirmButtonTextColor: "#ef4444",
    onConfirm: () => {
      socket.emit("give_up_drawer");
    }
  });
}

function handleAvatarClick(player) {
  if (!isDrawer.value) return;
  if (player.id === socketId.value) return;
  if (status.value !== "playing") return;

  Dialog({
    title: "🎉 猜对啦！",
    message: `确认是 ${player.name} 第一个猜对了吗？\n系统将自动为 TA 增加 1 颗星。`,
    confirmButtonText: "是的，加星",
    cancelButtonText: "手滑了",
    confirmButtonTextColor: "#10b981",
    onConfirm: () => {
      socket.emit("drawer_confirm_winner", { winnerId: player.id });
    }
  });
}

function saveImage() {
  gameBoardRef.value?.saveImage();
  Snackbar.success("正在保存画作...");
}

function selectColor(color) {
  currentTool.value = "pen";
  currentColor.value = color;
}
function toggleEraser() {
  currentTool.value = "eraser";
}
function confirmClear() {
  Dialog({
    title: "🗑️ 清空画板",
    message: "确定要擦除所有内容重新开始吗？无法撤销哦。",
    confirmButtonText: "清空",
    confirmButtonTextColor: "#ef4444",
    onConfirm: () => gameBoardRef.value?.clearCanvas(true)
  });
}

// TTS & Watchers
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

/* watch(status, (newVal, oldVal) => {
  if (newVal === "playing" && oldVal !== "playing") {
    if (isDrawer.value) speak(`你要画的是：${currentWord.value}`);
  }
});

watch(isDrawer, newVal => {
  if (newVal && status.value === "playing") speak(`你要画的是：${currentWord.value}`);
}); */

// Lifecycle
onMounted(() => {
  // Set theme colors if needed, but relying on component props for now

  socket.on("connect", () => {
    if (myName.value) socket.emit("join_game", { name: myName.value });
  });

  socket.on("error_msg", msg => {
    Snackbar.warning(msg);
    if (msg.includes("已被占用")) {
      myName.value = "";
      localStorage.removeItem("family_hub_name");
      showRoleSelect.value = true;
    }
  });

  socket.on("score_animate", ({ playerId }) => {
    scoreEffects.value[playerId] = true;
    setTimeout(() => (scoreEffects.value[playerId] = false), 1000);
  });

  socket.on("sync_history", history => {
    gameBoardRef.value?.replayHistory(history);
  });

  socket.on("player_won", ({ winnerId, name }) => {
    // Play sound or effect
    speak(`恭喜${name}集齐五颗星，获得胜利！`);
    
    Dialog({
      title: "🏆 冠军诞生！",
      message: `🎉 恭喜 ${name} 率先集满 5 颗星，获得最终胜利！`,
      confirmButtonText: "再来一局",
      confirmButtonTextColor: "#f59e0b", // Gold
      onConfirm: () => {
        // Just close the dialog. 
        // Game flow:
        // 1. Server already set status='waiting'.
        // 2. Scores are kept for display (Celebration).
        // 3. Scores will be auto-reset by Server when anyone counts down 'startRound' again.
      }
    });
  });

  // Wake Lock logic omitted for brevity, assumed separate or browser handled usually
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-[#fffbf0] overflow-hidden select-none">
    <!-- 1. AppBar Header -->
    <var-app-bar color="white" text-color="#333" elevation="2" title-position="center" class="z-50" :safe-area-top="true">
      <template #left>
        <var-button v-if="status !== 'playing'" round text color="transparent" text-color="#999" class="mr-2" @click="$router.push('/')">
          <var-icon name="home-outline" size="24" />
        </var-button>

        <var-button
          v-if="isDrawer"
          text-color="#fff"
          size="small"
          class="shadow-lg px-3 font-bold tracking-wide rounded-lg border-none"
          style="background: linear-gradient(to right, #ef4444, #dc2626)"
          @click="giveUpDrawer"
        >
          <var-icon name="power" size="16" class="mr-1" />
          结束
        </var-button>
      </template>

      <template #default>
        <div class="flex flex-col items-center justify-center h-full py-1">
          <template v-if="isDrawer">
            <div class="flex items-end gap-1.5">
              <div v-for="(item, index) in wordWithPinyin" :key="index" class="flex flex-col items-center">
                <span class="text-[10px] text-gray-400 font-mono leading-none mb-0.5">{{ item.py }}</span>
                <span class="text-xl font-bold text-gray-800 leading-none">{{ item.char }}</span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="flex items-center gap-2 text-gray-400">
              <var-loading v-if="currentDrawerId && status === 'playing'" type="wave" size="mini" color="#aaa" />
              <span class="text-sm font-medium tracking-wide">
                {{ status === "playing" ? (currentDrawerId ? `${currentDrawerName} 正在作画...` : "游戏进行中") : "等待开始" }}
              </span>
            </div>
          </template>
        </div>
      </template>

      <template #right>
        <div v-if="isDrawer" class="pr-2">
          <var-button
            text-color="#fff"
            size="small"
            @click="changeWord"
            class="shadow-lg px-3 font-bold tracking-wide rounded-lg border-none"
            style="background: linear-gradient(to right, #3b82f6, #2563eb)"
          >
            <span class="mr-1">换一题</span>
            <var-icon name="refresh" size="16" />
          </var-button>
        </div>
      </template>
    </var-app-bar>

    <!-- 2. Main Game Board -->
    <main class="flex-1 w-full relative bg-[#fffcef] overflow-hidden shadow-inner">
      <GameBoard
        ref="gameBoardRef"
        :is-drawer="isDrawer"
        :disabled="status !== 'playing'"
        :stroke-color="currentTool === 'eraser' ? '#fffcef' : currentColor"
        :stroke-width="currentTool === 'eraser' ? 60 : 6"
      />

      <!-- Drawing Toolbar (Floating) -->
      <transition name="fade-slide-up">
        <div v-if="isDrawer" class="absolute bottom-6 left-0 w-full flex justify-center items-center z-30 pointer-events-none">
          <var-paper
            :elevation="4"
            radius="100"
            class="pointer-events-auto bg-white/95 backdrop-blur px-4 py-2 flex items-center gap-4 border border-gray-100"
          >
            <!-- Colors -->
            <div class="flex items-center gap-3">
              <div
                v-for="color in palette"
                :key="color"
                class="w-7 h-7 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center"
                :class="[
                  currentColor === color && currentTool === 'pen'
                    ? 'scale-110 ring-2 ring-offset-2 ring-gray-300'
                    : 'hover:scale-105 shadow-inner'
                ]"
                :style="{ background: color }"
                @click="selectColor(color)"
              >
                <var-icon v-if="currentColor === color && currentTool === 'pen'" name="check" size="14" color="#fff" />
              </div>
            </div>

            <var-divider vertical class="h-6 mx-0" />

            <!-- Tools -->
            <div class="flex items-center gap-2">
              <var-button
                round
                size="small"
                :type="currentTool === 'eraser' ? 'primary' : 'default'"
                :color="currentTool === 'eraser' ? null : '#f3f4f6'"
                :text-color="currentTool === 'eraser' ? '#ffffff' : '#666666'"
                @click="toggleEraser"
                class="transition-colors"
                ripple
              >
                <var-icon name="cake-variant" size="18" />
              </var-button>
              <var-button round size="small" color="#fee2e2" text-color="#ef4444" @click="confirmClear" ripple>
                <var-icon name="trash-can-outline" size="18" />
              </var-button>
            </div>
          </var-paper>
        </div>
      </transition>

      <!-- Waiting Overlay -->
      <transition name="fade">
        <div
          v-if="status === 'waiting'"
          class="absolute inset-0 bg-amber-50/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 overflow-hidden"
        >
          <!-- Decorative Background Elements -->
          <div
            class="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"
          ></div>
          <div
            class="absolute top-1/3 right-1/4 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"
          ></div>
          <div
            class="absolute bottom-1/4 left-1/2 w-32 h-32 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"
          ></div>

          <var-paper
            :elevation="10"
            radius="24"
            class="w-full max-w-sm relative bg-white/90 p-8 flex flex-col items-center text-center border-2 border-white shadow-2xl overflow-hidden"
          >
            <div class="text-7xl mb-6 transform hover:scale-110 transition-transform duration-300 cursor-default select-none">🎨</div>

            <h2
              class="text-3xl font-black mb-2 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent tracking-tight"
            >
              温馨家庭画画乐
            </h2>

            <div class="mb-8 flex items-center justify-center">
              <var-chip plain type="primary" size="small" class="font-bold tracking-wider border-none bg-blue-50 text-blue-600 uppercase">
                <template #left>
                  <var-icon name="palette-outline" size="14" class="mr-1" />
                </template>
                Family Drawing Party
              </var-chip>
            </div>

            <!-- Player Count Status -->
            <div class="w-full bg-gray-50 rounded-xl p-4 mb-8 border border-gray-100 flex items-center justify-between shadow-inner">
              <div class="flex items-center gap-2">
                <span class="flex h-3 w-3 relative">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span class="text-sm text-gray-600 font-bold">家人已就位</span>
              </div>
              <span class="text-xl font-black text-gray-800 font-mono"
                >{{ players.length }}<span class="text-sm font-normal text-gray-400 ml-1">人</span></span
              >
            </div>

            <!-- Action Button -->
            <var-button
              block
              color="linear-gradient(to right, #ff9966, #ff5e62)"
              text-color="#fff"
              size="large"
              radius="14"
              class="font-bold text-lg shadow-lg shadow-orange-500/30 transform active:scale-95 transition-all"
              @click="claimDrawer"
            >
              我是画家，开始！
            </var-button>

            <p class="mt-4 text-xs text-gray-400">点击上方按钮，开启本轮绘画</p>
          </var-paper>
        </div>
      </transition>
    </main>

    <!-- 3. Footer Player List -->
    <!-- 3. Footer Player Bar -->
    <!-- 3. Footer Player Bar -->
    <div
      class="w-full h-50 shrink-0 bg-white border-t border-gray-100 z-50 flex items-start px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar pb-safe"
    >
      <div v-if="players.length === 0" class="w-full flex items-center justify-center gap-2 text-gray-400 py-2">
        <var-loading type="cube" size="small" color="#aaa" />
        <span class="text-xs font-medium tracking-wide">等待家人加入...</span>
      </div>

      <div v-else class="flex items-center w-full min-w-max px-2">
        <transition-group name="list">
          <div
            v-for="p in sortedPlayers"
            :key="p.id"
            class="flex items-center rounded-full border p-0.5 pr-2 mr-2 transition-all duration-300 cursor-pointer select-none active:scale-95 shrink-0 bg-gray-50 border-gray-200"
            :class="[
              p.id === currentDrawerId
                ? 'bg-orange-50/80 border-orange-200 ring-2 ring-orange-100 ring-offset-1 pr-3 shadow-md'
                : 'bg-gray-50 border-gray-200 hover:bg-white hover:shadow-sm pr-2'
            ]"
            @click="handleAvatarClick(p)"
          >
            <!-- Avatar (Small) -->
            <div class="relative">
              <var-avatar
                size="small"
                :style="{ background: getAvatarColor(p.name) }"
                class="border border-white shadow-sm font-bold text-[10px]"
              >
                {{ p.name.slice(-2) }}
              </var-avatar>
            </div>

            <!-- Info Block (No Name, Just Score/Status) -->
            <div class="ml-1.5 flex flex-col justify-center">
              <!-- Drawer Status -->
              <div v-if="p.id === currentDrawerId" class="flex items-center">
                <var-loading type="wave" size="9" color="#f97316" class="mr-1" />
                <span class="text-[10px] font-black text-orange-500 tracking-widest leading-none">正在作画</span>
              </div>

              <!-- Score (For others) -->
              <div v-else class="flex items-center justify-center min-w-[80px]">
                 <var-rate
                  :model-value="Number(scores[p.name] || 0)"
                  :count="5"
                  readonly
                  icon="star"
                  empty-icon="star-outline"
                  color="#fbbf24"
                  empty-color="#e2e8f0"
                  :size="18"
                  class="transition-transform duration-200"
                />
              </div>
            </div>

            <!-- Add Score Action (Restored) -->
            <var-icon
              v-if="isDrawer && p.id !== currentDrawerId"
              name="plus-circle-outline"
              size="18"
              class="ml-1.5 text-gray-300 hover:text-green-500 transition-colors active:scale-95"
            />
          </div>
        </transition-group>
      </div>
    </div>

    <!-- Role Select Popup -->
    <var-popup v-model:show="showRoleSelect" :close-on-click-overlay="false" class="rounded-2xl overflow-hidden w-80">
      <div class="bg-white p-6 text-center">
        <h3 class="text-xl font-bold text-gray-800 mb-2">欢迎参加家庭聚会</h3>
        <p class="text-gray-400 text-sm mb-6">请选择你的身份</p>
        <var-space direction="column" size="large">
          <var-button
            v-for="role in predefinedRoles"
            :key="role"
            block
            size="large"
            :disabled="players.some(p => p.name === role)"
            :style="{
              background: players.some(p => p.name === role) ? '#f3f4f6' : getAvatarColor(role),
              color: players.some(p => p.name === role) ? '#9ca3af' : 'white',
              border: 'none'
            }"
            class="shadow-md font-bold"
            @click="selectRole(role)"
          >
            <template #prepend>
              <var-icon name="account-circle" class="mr-1" />
            </template>
            {{ role }}
            <template #append v-if="players.some(p => p.name === role)">
              <span class="text-xs ml-2">(已存在)</span>
            </template>
          </var-button>
        </var-space>
      </div>
    </var-popup>
  </div>
</template>

<style scoped>
/* Scoped utility tweaks */
.animate-bounce-slow {
  animation: bounce 3s infinite;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-slide-up-enter-active,
.fade-slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-slide-up-enter-from,
.fade-slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Background Blob Animation */
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
