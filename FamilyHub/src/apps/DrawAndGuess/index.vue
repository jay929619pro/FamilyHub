<template>
  <div class="flex flex-col h-full relative">
    <!-- Top Bar -->
    <div
      class="flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm z-10"
    >
      <div class="flex items-center space-x-4">
        <div class="flex flex-col">
            <div class="text-xs text-gray-500">Round</div>
            <div class="font-bold">{{ gameStore.round }} / {{ gameStore.totalRounds }}</div>
        </div>
        
        <div class="text-2xl font-bold font-mono" :class="{'text-red-500': gameStore.timeLeft < 10, 'text-family-primary': gameStore.timeLeft >= 10}">
          {{ gameStore.timeLeft }}s
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
         <!-- Status Badge -->
         <div v-if="gameStore.phase === 'LOBBY'" class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
             等待开始
         </div>
         <div v-else-if="gameStore.phase === 'SELECTING'" class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
             {{ gameStore.isDrawer ? '请选词' : '画师正在选词...' }}
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
    <div
      class="flex-1 relative bg-white m-4 rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
    >
     <!-- Lobby / Game End Overlay -->
      <div v-if="gameStore.phase === 'LOBBY' || gameStore.phase === 'GAME_END'" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur">
          <h2 class="text-3xl font-bold mb-6 text-family-primary">你画我猜</h2>
          <div class="mb-8 space-y-2 w-64 max-h-48 overflow-y-auto">
              <div v-for="p in gameStore.players" :key="p.id" class="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{{ p.name }}</span>
                  <span class="font-bold">{{ p.score }}分</span>
              </div>
          </div>
          <van-button round type="primary" size="large" color="#FF9F43" @click="startGame" class="w-48 shadow-lg !text-xl !font-bold">
              开始游戏
          </van-button>
      </div>

      <CanvasBoard :isDrawer="gameStore.isDrawer" />
    </div>

    <!-- Bottom: Guess Input -->
    <div v-if="!gameStore.isDrawer && gameStore.phase === 'DRAWING'" class="p-4 bg-white border-t border-gray-100">
      <van-field
        v-model="guessInput"
        center
        clearable
        placeholder="输入你的答案..."
        @keyup.enter="submitGuess"
      >
        <template #button>
          <van-button
            size="small"
            type="primary"
            color="#FF9F43"
            @click="submitGuess"
          >
            提交
          </van-button>
        </template>
      </van-field>
    </div>
    
    <!-- Drawer Tools (Start Simple) -->
    <div v-if="gameStore.isDrawer && gameStore.phase === 'DRAWING'" class="p-4 bg-white border-t border-gray-100 flex justify-center text-gray-500">
        正在作画中...
    </div>

    <!-- Word Selection Popup -->
    <van-popup
      :show="showWordSelect"
      :close-on-click-overlay="false"
      round
      position="bottom"
      :style="{ height: '40%' }"
    >
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
import { useGameBridge } from "../../core/useGameBridge"; // Keep if needed directly
import { useSync } from "./composables/useSync";
import { useGameStore } from "@/stores/game";

const { sendGameStart, sendSelectWord, sendGuess } = useSync();
const gameStore = useGameStore();

const guessInput = ref("");

// Computed
const showWordSelect = computed(() => {
    return gameStore.phase === 'SELECTING' && gameStore.isDrawer;
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

// Lifecycle
// onMounted handled in CanvasBoard or global hooks usually, but ensure listeners are active
</script>
