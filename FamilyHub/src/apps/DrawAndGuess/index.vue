<template>
  <div class="flex flex-col h-full relative">
    <!-- Top Bar: Countdown & Keyword -->
    <div
      class="flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm z-10"
    >
      <div class="flex items-center space-x-2">
        <div class="text-2xl font-bold text-family-primary">
          {{ timeLeft }}s
        </div>
        <div class="text-sm text-gray-500">倒计时</div>
      </div>
      <div
        v-if="isDrawer"
        class="text-lg font-bold bg-yellow-100 px-4 py-1 rounded-full text-yellow-800"
      >
        题目: {{ currentWord }}
      </div>
    </div>

    <!-- Main Canvas Area -->
    <div
      class="flex-1 relative bg-white m-4 rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <CanvasBoard :isDrawer="isDrawer" />
    </div>

    <!-- Bottom: Guess Input (Mobile optimized) -->
    <div v-if="!isDrawer" class="p-4 bg-white border-t border-gray-100">
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

    <!-- Word Selection Popup -->
    <van-popup
      v-model:show="showWordSelect"
      round
      position="bottom"
      :style="{ height: '40%' }"
    >
      <div class="p-6">
        <h3 class="text-lg font-bold mb-4 text-center">轮到你了，选个词吧！</h3>
        <div class="grid grid-cols-2 gap-4">
          <button
            v-for="word in wordsToSelect"
            :key="word"
            class="p-4 bg-family-warm rounded-xl text-center active:bg-orange-200 transition-colors"
            @click="selectWord(word)"
          >
            {{ word }}
          </button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import CanvasBoard from "./components/CanvasBoard.vue";
import { useGameBridge } from "../../core/useGameBridge";

const { sendAction } = useGameBridge();
const APP_ID = "draw-guess";

// State
const isDrawer = ref(false);
const timeLeft = ref(60);
const currentWord = ref("");
const guessInput = ref("");
const showWordSelect = ref(false);
const wordsToSelect = ref(["苹果", "大象", "很多钱", "外星人"]);

// Logic
function selectWord(word) {
  currentWord.value = word;
  showWordSelect.value = false;
  isDrawer.value = true;
  sendAction(APP_ID, "game-start", { word });
}

function submitGuess() {
  if (!guessInput.value) return;
  sendAction(APP_ID, "guess", { text: guessInput.value });
  guessInput.value = "";
}

// Lifecycle
onMounted(() => {
  // Simulate game start for demo
  setTimeout(() => {
    showWordSelect.value = true;
  }, 1000);
});
</script>
