<template>
  <div class="flex flex-col h-full relative">
    <!-- Top Bar -->
    <div class="flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm z-10">
      <div class="flex items-center space-x-4">
        <router-link to="/" class="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"> 🏠 </router-link>

        <div v-if="gameStore.phase !== 'LOBBY' && gameStore.phase !== 'GAME_END'" class="flex items-center space-x-4">
          <div class="flex flex-col">
            <div class="text-xs text-gray-500">Round</div>
            <div class="font-bold">{{ gameStore.round }} / {{ gameStore.totalRounds }}</div>
          </div>

          <div
            class="text-2xl font-bold font-mono"
            :class="{ 'text-red-500': gameStore.timeLeft < 10, 'text-family-primary': gameStore.timeLeft >= 10 }"
          >
            {{ gameStore.timeLeft }}s
          </div>
        </div>

        <!-- Connection Status -->
        <div class="flex items-center" :class="connected ? 'text-green-500' : 'text-red-500'">
          <div class="w-3 h-3 rounded-full mr-1" :class="connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'"></div>
          <span class="text-xs font-bold">{{ connected ? "Online" : "Offline" }}</span>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <!-- Status Badge -->
        <div v-if="gameStore.phase === 'LOBBY'" class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">等待开始</div>
        <div v-else-if="gameStore.phase === 'SELECTING'" class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
          {{ gameStore.isDrawer ? "请选词" : "画师正在选词..." }}
        </div>

        <div
          v-if="gameStore.phase === 'DRAWING' && gameStore.isDrawer"
          class="text-lg font-bold bg-green-100 px-4 py-1 rounded-full text-green-800"
        >
          题目: {{ gameStore.mySecretWord }}
        </div>
      </div>
    </div>

    <!-- Main Canvas Area -->
    <div class="flex-1 relative bg-white m-4 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Lobby / Game End Overlay -->
      <!-- Lobby / Game End Overlay -->
      <div
        v-if="gameStore.phase === 'LOBBY' || gameStore.phase === 'GAME_END'"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur"
      >
        <template v-if="gameStore.phase === 'LOBBY'">
          <h2 class="text-3xl font-bold mb-6 text-family-primary">你画我猜</h2>
          <div class="mb-8 space-y-2 w-64 max-h-48 overflow-y-auto">
            <div v-for="p in gameStore.players" :key="p.id" class="flex justify-between items-center p-2 bg-gray-50 rounded">
              <div class="flex items-center">
                <span class="text-2xl mr-2">{{ p.avatar || "😊" }}</span>
                <span class="font-bold">{{ p.name }}</span>
                <span v-if="p.id === gameStore.myPlayerId" class="ml-2 text-xs text-gray-500">(我)</span>
              </div>
              <!-- Hide score in lobby -->
            </div>
            <div v-if="gameStore.players.length === 0" class="text-gray-400 text-center">等待玩家加入...</div>
          </div>
          <van-button round type="primary" size="large" color="#FF9F43" @click="startGame" class="w-48 shadow-lg !text-xl !font-bold">
            开始游戏
          </van-button>
        </template>

        <template v-else-if="gameStore.phase === 'GAME_END'">
          <h2 class="text-4xl font-bold mb-2 text-family-primary">🎮 游戏结束</h2>
          <p class="text-gray-500 mb-6">最终排行榜</p>

          <div class="mb-8 space-y-3 w-72">
            <div
              v-for="(p, index) in sortedPlayers"
              :key="p.id"
              class="flex justify-between items-center p-3 bg-white border-2 rounded-xl shadow-sm relative overflow-hidden"
              :class="{
                'border-yellow-400 bg-yellow-50': index === 0,
                'border-gray-300': index === 1,
                'border-orange-200': index === 2,
                'border-gray-100': index > 2
              }"
            >
              <!-- Rank Badge -->
              <div
                class="absolute left-0 top-0 bottom-0 w-1"
                :class="{
                  'bg-yellow-400': index === 0,
                  'bg-gray-400': index === 1,
                  'bg-orange-400': index === 2,
                  'bg-transparent': index > 2
                }"
              ></div>

              <div class="flex items-center pl-2">
                <div
                  class="font-bold text-lg mr-3 w-6 text-center"
                  :class="{
                    'text-yellow-600': index === 0,
                    'text-gray-600': index === 1,
                    'text-orange-600': index === 2,
                    'text-gray-400': index > 2
                  }"
                >
                  {{ index + 1 }}
                </div>
                <span class="text-2xl mr-2">{{ p.avatar || "😊" }}</span>
                <span class="font-bold text-gray-800 truncate max-w-[8rem]">{{ p.name }}</span>
              </div>
              <span class="font-bold text-xl text-family-primary">{{ p.score }}</span>
            </div>
          </div>

          <van-button
            round
            type="primary"
            size="large"
            color="#FF9F43"
            @click="startGame"
            class="w-48 shadow-lg !text-xl !font-bold animate-bounce-slow"
          >
            再玩一次
          </van-button>
        </template>
      </div>

      <CanvasBoard :isDrawer="gameStore.isDrawer" />
    </div>

    <!-- Bottom: Guess Input -->
    <div v-if="!gameStore.isDrawer && gameStore.phase === 'DRAWING'" class="p-4 bg-white border-t border-gray-100">
      <van-field v-model="guessInput" center clearable placeholder="输入你的答案..." @keyup.enter="submitGuess">
        <template #button>
          <van-button size="small" type="primary" color="#FF9F43" @click="submitGuess"> 提交 </van-button>
        </template>
      </van-field>
    </div>

    <!-- Drawer Tools -->
    <div
      v-if="gameStore.isDrawer && gameStore.phase === 'DRAWING'"
      class="p-4 bg-white border-t border-gray-100 flex justify-center text-gray-500"
    >
      正在作画中...
    </div>

    <!-- Word Selection Popup -->
    <van-popup :show="showWordSelect" :close-on-click-overlay="false" round position="bottom" :style="{ height: '40%' }">
      <div class="p-6">
        <h3 class="text-lg font-bold mb-4 text-center">轮到你了，选个词吧！</h3>
        <div class="grid grid-cols-2 gap-4">
          <button
            v-for="word in gameStore.wordsToSelect"
            :key="word"
            class="p-4 bg-family-warm rounded-xl text-center active:bg-orange-200 transition-colors font-bold text-gray-700"
            @click="handleSelectWord(word)"
          >
            {{ word }}
          </button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import CanvasBoard from "./components/CanvasBoard.vue";
import { useGameBridge } from "../../core/useGameBridge";
import { useSync } from "./composables/useSync";
import { useGameStore } from "@/stores/game";
import confetti from "canvas-confetti";
import { showToast, showDialog } from "vant";

const { sendGameStart, sendSelectWord, sendGuess, onAction, initListeners, connected } = useSync();
const gameStore = useGameStore();

// Initialize socket listeners
initListeners();

const guessInput = ref("");

// Computed
const showWordSelect = computed(() => {
  return gameStore.phase === "SELECTING" && gameStore.isDrawer;
});

const sortedPlayers = computed(() => {
  return [...gameStore.players].sort((a, b) => b.score - a.score);
});

// Event Listeners for Effects
onMounted(() => {
  // Listen for round results to show confetti/toast
  // useSync's onAction wrapper exposes the raw listener
  onAction("draw-guess", "round-result", ({ reason, word }) => {
    showDialog({
      title: reason,
      message: `答案是：${word}`,
      theme: "round-button"
    });

    if (reason.includes("猜对了")) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  });

  onAction("draw-guess", "chat-message", ({ from, text }) => {
    showToast({
      message: `${from}: ${text}`,
      position: "bottom"
    });
  });
});

// Logic
function startGame() {
  sendGameStart();
}

function handleSelectWord(word) {
  sendSelectWord(word);
}

function submitGuess() {
  if (!guessInput.value) return;
  sendGuess(guessInput.value);
  guessInput.value = "";
}
</script>
