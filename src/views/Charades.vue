<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useCharadesGame } from "../composables/useCharadesGame";
import { pinyin } from "pinyin-pro";

const router = useRouter();

const {
  status,
  selectedCategory,
  gameDuration,
  timeLeft,
  currentWord,
  score,
  resultHistory,
  CATEGORIES,
  setCategory,
  startGame,
  startRoundLogic,
  handleResult,
  endGame,
  resetGame
} = useCharadesGame();

// === Computed Pinyin ===
const wordWithPinyin = computed(() => {
  if (!currentWord.value) return [];
  const chars = currentWord.value.split("");
  return chars.map(char => ({
    char,
    py: pinyin(char, { type: "string", toneType: "symbol" })
  }));
});

// === Audio Context ===
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playSound(type) {
  if (!audioCtx) initAudio();
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === "correct") {
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } else if (type === "pass") {
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } else if (type === "tick") {
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.05);
    }
  } catch (e) {
    console.warn("Audio play failed", e);
  }
}

// === Wake Lock ===
// === Device Motion & Wake Lock ===
// === Tilt Controller & Wake Lock ===
// === Wake Lock ===
let wakeLock = null;

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch (err) {
    console.warn("Wake Lock failed:", err);
  }
}

// Feedback State
const feedbackStatus = ref(null);

// === Game Flow Control ===
const countdown = ref(3);

async function onStartGame() {
  initAudio();
  await requestWakeLock();

  startGame();

  countdown.value = 3;
  const timer = setInterval(() => {
    countdown.value--;
    playSound("tick");

    if (countdown.value <= 0) {
      clearInterval(timer);
      startRoundLogic();
    }
  }, 1000);
}

function onAction(type) {
  if (status.value !== "playing") return;

  // Feedback Logic
  feedbackStatus.value = type;
  setTimeout(() => {
    feedbackStatus.value = null;
  }, 300);

  // Vibration for touch feedback
  if (type === "correct") {
    if (navigator.vibrate) navigator.vibrate(200);
  }

  playSound(type);
  handleResult(type);
}

function onExit() {
  resetGame();
  if (wakeLock) wakeLock.release();
  router.push("/");
}

// Computed Styles
const bgColor = computed(() => {
  if (status.value === "playing") return "#3b82f6"; // Blue
  if (status.value === "finished") return "#fffbf0";
  return "#f3e8ff"; // Setup
});
</script>

<template>
  <div class="h-screen w-screen overflow-hidden flex flex-col transition-colors duration-500" :style="{ background: bgColor }">
    <!-- === Setup Phase === -->
    <template v-if="status === 'setup'">
      <var-app-bar title="你比我猜" color="transparent" text-color="#333" :elevation="0" :safe-area-top="true">
        <template #left>
          <var-button round text color="transparent" text-color="#333" @click="router.back()">
            <var-icon name="chevron-left" size="24" />
          </var-button>
        </template>
      </var-app-bar>

      <div class="flex-1 flex flex-col p-6 overflow-y-auto">
        <h2 class="text-2xl font-black text-gray-800 mb-6">选择题库</h2>

        <div class="grid grid-cols-2 gap-4 mb-8">
          <div
            v-for="cat in CATEGORIES"
            :key="cat.id"
            class="relative p-4 rounded-3xl transition-all duration-200 cursor-pointer border-2"
            :class="[
              selectedCategory.id === cat.id
                ? 'bg-white border-purple-500 shadow-lg scale-105'
                : 'bg-white/50 border-transparent hover:bg-white'
            ]"
            @click="setCategory(cat)"
          >
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-white shadow-md relative overflow-hidden"
              :style="{ background: cat.color }"
            >
              <span class="text-2xl relative z-10">{{ cat.emoji }}</span>
            </div>
            <h3 class="font-bold text-gray-800">{{ cat.title }}</h3>
            <p class="text-xs text-gray-400 mt-1">{{ cat.words.length }} 个词语</p>

            <div v-if="selectedCategory.id === cat.id" class="absolute top-3 right-3 text-purple-500">
              <var-icon name="check-circle" />
            </div>
          </div>
        </div>

        <h2 class="text-2xl font-black text-gray-800 mb-4">游戏时长</h2>
        <div class="bg-white p-6 rounded-3xl shadow-sm mb-8">
          <div class="flex justify-between text-lg font-bold text-gray-600 mb-4">
            <span>{{ gameDuration }} 秒</span>
            <var-icon name="timer-outline" />
          </div>
          <var-slider
            v-model="gameDuration"
            :min="30"
            :max="180"
            :step="10"
            track-color="#e9d5ff"
            thumb-color="#a855f7"
            label-visible="always"
          />
        </div>

        <var-button
          block
          size="large"
          radius="16"
          color="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
          text-color="#fff"
          class="mt-auto shadow-xl font-bold text-xl h-14"
          @click="onStartGame"
        >
          开始游戏
        </var-button>
      </div>
    </template>

    <!-- === Active Game Phases (Ready & Playing) === -->
    <template v-else-if="status === 'ready' || status === 'playing'">
      <!-- Feedback Flash Overlay -->
      <div
        class="fixed inset-0 z-[999] pointer-events-none transition-colors duration-200"
        :class="{
          'bg-green-500/30': feedbackStatus === 'correct',
          'bg-red-500/30': feedbackStatus === 'pass'
        }"
      ></div>

      <!-- Wrapper that forces landscape layout in portrait mode -->
      <div class="force-landscape-wrapper relative w-full h-full">
        <!-- Countdown View -->
        <div v-if="status === 'ready'" class="absolute inset-0 flex flex-col items-center justify-center bg-purple-600 text-white z-20">
          <h1 class="text-[120px] font-black animate-bounce">{{ countdown }}</h1>
          <p class="text-xl opacity-80 mt-4 font-bold">将手机横屏举在额头</p>
          <var-icon name="cellphone" size="64" class="mt-8 animate-pulse rotate-90" />
        </div>

        <!-- Gameplay View -->
        <div v-else class="absolute inset-0 flex w-full h-full relative">
          <!-- Left Touch (Pass) -->
          <div
            class="h-full w-1/4 bg-red-500/10 active:bg-red-500/30 flex items-center justify-center border-r border-white/10"
            @click="onAction('pass')"
          >
            <div class="text-white/60 font-bold whitespace-nowrap text-xl text-center flex flex-col items-center">
              <var-icon name="close" size="48" class="mb-4" />
              <span>跳过</span>
              <span class="text-sm opacity-60">PASS</span>
            </div>
          </div>

          <!-- Center Word -->
          <div class="flex-1 flex flex-col items-center justify-center relative">
            <div class="absolute top-6 font-mono text-white/80 text-3xl font-bold bg-black/20 px-6 py-2 rounded-full">{{ timeLeft }}s</div>

            <!-- Word & Pinyin Display -->
            <div class="flex items-end justify-center gap-1 md:gap-4 px-4 w-full">
              <div v-for="(item, index) in wordWithPinyin" :key="index" class="flex flex-col items-center justify-end">
                <!-- Pinyin -->
                <span class="text-3xl md:text-5xl font-mono font-medium text-white/90 mb-2 md:mb-4 tracking-wider">{{ item.py }}</span>
                <!-- Char -->
                <span class="font-black text-white leading-none drop-shadow-lg select-none" style="font-size: min(18vh, 18vw)">
                  {{ item.char }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right Touch (Correct) -->
          <div
            class="h-full w-1/4 bg-green-500/10 active:bg-green-500/30 flex items-center justify-center border-l border-white/10"
            @click="onAction('correct')"
          >
            <div class="text-white/60 font-bold whitespace-nowrap text-xl text-center flex flex-col items-center">
              <var-icon name="check" size="48" class="mb-4" />
              <span>正确</span>
              <span class="text-sm opacity-60">YES</span>
            </div>
          </div>

          <!-- Helper Text Bottom -->
          <div class="absolute bottom-4 left-0 w-full text-center text-white/30 text-sm font-bold animate-pulse">
            观众请指挥 · 猜对点右边
          </div>
        </div>
      </div>
    </template>

    <!-- === Finished Phase === -->
    <template v-else-if="status === 'finished'">
      <div class="flex-1 flex flex-col bg-[#fffbf0] p-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-purple-100 to-transparent -z-0"></div>

        <div class="text-center mt-8 mb-8 z-10">
          <h2 class="text-gray-500 font-bold text-lg mb-2">本次得分</h2>
          <div class="text-8xl font-black text-purple-600 font-mono tracking-tighter">{{ score }}</div>
        </div>

        <div class="flex-1 overflow-y-auto z-10 bg-white rounded-3xl shadow-sm p-4 mb-6 border border-purple-50">
          <h3 class="font-bold text-gray-400 mb-4 text-sm uppercase tracking-wide">答题详情</h3>
          <div class="space-y-3 pb-4">
            <div v-for="(item, idx) in resultHistory" :key="idx" class="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span class="text-lg font-bold text-gray-700">{{ item.word }}</span>
              <var-chip :type="item.status === 'correct' ? 'success' : 'danger'" size="small" plain>
                {{ item.status === "correct" ? "答对" : "跳过" }}
              </var-chip>
            </div>
            <div v-if="resultHistory.length === 0" class="text-center text-gray-400 py-8">都没有答题哦，下次加油！</div>
          </div>
        </div>

        <div class="flex gap-4 z-10">
          <var-button block class="flex-1" size="large" radius="12" type="warning" text-color="#fff" color="#fbbf24" @click="onExit">
            返回大厅
          </var-button>
          <var-button block class="flex-1 bold-btn" size="large" radius="12" color="#8b5cf6" text-color="#fff" @click="resetGame">
            再玩一次
          </var-button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bold-btn {
  font-weight: 800;
  font-size: 1.1rem;
}

/* Force Landscape Logic */
@media screen and (orientation: portrait) {
  .force-landscape-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vh; /* Swap width/height to fill rotated view */
    height: 100vw;
    transform-origin: top left;
    transform: rotate(90deg) translateY(-100%);
    z-index: 100;
  }
}

@media screen and (orientation: landscape) {
  .force-landscape-wrapper {
    width: 100%;
    height: 100%;
  }
}
</style>
