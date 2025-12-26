<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Dialog } from "@varlet/ui";
import confetti from "canvas-confetti";

// 引入题型组件 (后续创建)
import VisualBalance from "../components/logic/VisualBalance.vue";
import PatternMatcher from "../components/logic/PatternMatcher.vue";

const router = useRouter();

// === 游戏状态 ===
const currentLevel = ref(1);
const score = ref(0);
const currentPuzzleType = ref("balance"); // 'balance' | 'pattern' | 'cube'
const currentPuzzleData = ref(null);
const isTransitioning = ref(false);

// === 关卡配置 (Mock Data - 后续可改为生成器) ===
// 这里演示如何混合不同题型
const LEVEL_MAP = [
  {
    level: 1,
    type: "balance",
    title: "谁更重？",
    data: {
      mode: "greater", // 找出更重的一边
      left: { type: "elephant", count: 1 },
      right: { type: "lion", count: 1 },
      options: ["left", "right"],
      answer: "left" // 大象重
    }
  },
  {
    level: 2,
    type: "pattern",
    title: "找规律",
    data: {
      sequence: ["🍎", "🍌", "🍎", "🍌", "?"],
      options: ["🍎", "🍌", "🍇"],
      answer: "🍎"
    }
  },
  {
    level: 3,
    type: "balance",
    title: "代数平衡",
    data: {
      mode: "equal_fill", // 填空让两边相等
      left: { type: "rabbit", count: 3 }, // 3 rabbits
      right: { type: "lion", count: 1 }, // 1 lion (known: 1 lion=2 rabbits? Need config)
      // 这需要题库自带逻辑定义，简化版：
      // 直接定义题目：左边3个兔子。右边有一个狮子(重2兔子)。问右边还要加几个兔子？
      // 这是一个更复杂的组件逻辑。为了MVP，我们先做“选择题”模式的平衡。
      question: "左边重还是右边重？(1🍎 = 1🍌)",
      leftWeight: 5,
      rightWeight: 3,
      options: ["<", ">", "="],
      answer: ">"
    }
  }
];

// === 核心逻辑 ===
function loadLevel(lvl) {
  // 简单循环关卡
  const idx = (lvl - 1) % LEVEL_MAP.length;
  const config = LEVEL_MAP[idx];

  currentPuzzleType.value = config.type;
  currentPuzzleData.value = config.data;
  isTransitioning.value = false;
}

function handleAnswer(result) {
  if (isTransitioning.value) return;

  if (result === true) {
    // 正确
    score.value += 10;
    triggerSuccess();
  } else {
    // 错误
    triggerFail();
  }
}

function triggerSuccess() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });

  isTransitioning.value = true;
  setTimeout(() => {
    Dialog({
      title: "🎉 回答正确！",
      message: "你真棒！准备好下一关了吗？",
      confirmButtonText: "下一关"
    }).then(() => {
      currentLevel.value++;
      loadLevel(currentLevel.value);
    });
  }, 500);
}

function triggerFail() {
  Dialog({
    title: "🤔 再想一想",
    message: "答案好像不太对哦，再试一次？",
    confirmButtonText: "重试"
  });
}

onMounted(() => {
  loadLevel(1);
});
</script>

<template>
  <div class="h-screen w-screen bg-[#FFF8E1] flex flex-col font-sans select-none overflow-hidden">
    <!-- Header -->
    <div class="h-16 px-4 flex items-center justify-between shrink-0 relative z-20 bg-white/50 backdrop-blur-sm">
      <button class="text-[#5D4037] active:scale-95 transition-transform" @click="router.back()">
        <var-icon name="arrow-left" size="28" />
      </button>

      <div class="flex flex-col items-center">
        <div class="text-[#8D6E63] font-black tracking-widest text-sm uppercase">Level {{ currentLevel }}</div>
        <div class="w-16 h-1.5 bg-[#8D6E63]/10 rounded-full mt-1 overflow-hidden">
          <div class="h-full bg-[#4CAF50] rounded-full transition-all duration-500" :style="{ width: `${(currentLevel % 5) * 20}%` }"></div>
        </div>
      </div>

      <div class="flex items-center gap-1 text-[#FFB300] font-bold">
        <var-icon name="star" /> <span>{{ score }}</span>
      </div>
    </div>

    <!-- Main Game Area -->
    <div class="flex-1 flex flex-col items-center justify-center p-4 relative">
      <!-- Question Title -->
      <div class="text-xl font-bold text-[#5D4037] mb-8 text-center animate-fade-in-up">
        {{ LEVEL_MAP[(currentLevel - 1) % LEVEL_MAP.length]?.title }}
      </div>

      <!-- Dynamic Puzzle Component -->
      <!-- 使用 v-if 切换不同类型的题板 -->
      <div
        class="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 min-h-[300px] flex flex-col items-center justify-center border-b-4 border-[#E0E0E0] animate-zoom-in"
      >
        <VisualBalance v-if="currentPuzzleType === 'balance'" :data="currentPuzzleData" @answer="handleAnswer" />

        <PatternMatcher v-else-if="currentPuzzleType === 'pattern'" :data="currentPuzzleData" @answer="handleAnswer" />

        <div v-else class="text-gray-400">暂未支持的题型</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-zoom-in {
  animation: zoomIn 0.4s ease-out;
}
</style>
