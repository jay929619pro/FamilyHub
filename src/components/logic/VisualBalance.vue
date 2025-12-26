<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps(["data"]);
const emit = defineEmits(["answer"]);

// Simple visual map for items
const ICON_MAP = {
  apple: "🍎",
  banana: "🍌",
  grape: "🍇",
  elephant: "🐘",
  lion: "🦁",
  rabbit: "🐰"
};

function check(side) {
  const correct = props.data.answer;
  emit("answer", side === correct);
}
</script>

<template>
  <div class="w-full flex flex-col items-center">
    <!-- 静态天平可视化 -->
    <!-- 这里用 CSS 画一个更简单的“跷跷板” -->
    <div class="relative w-64 h-40 flex items-end justify-center mb-8">
      <!-- Pillar -->
      <div class="absolute bottom-0 w-4 h-32 bg-[#8D6E63] rounded-t-lg"></div>

      <!-- Beam (Dynamic Rotation) -->
      <!-- 如果 mode 是 greater, 我们让它真的歪掉来作为提示？或者这是题目，不应该歪？ -->
      <!-- 这里的逻辑是：题目问“谁更重”，所以天平默认应该是平的（如果是推理题），或者是歪的（如果是观察题）。 -->
      <!-- 简化版 Level 1: 天平是平的，问逻辑。 -->
      <div
        class="relative w-full h-3 bg-[#A1887F] rounded-full transition-transform duration-500 flex justify-between items-center z-10 origin-center"
        :class="{
          'rotate-12': props.data.answer === 'right' && props.data.mode === 'observation',
          '-rotate-12': props.data.answer === 'left' && props.data.mode === 'observation'
        }"
      >
        <!-- Left Pan -->
        <div class="absolute left-0 top-1 flex flex-col items-center -translate-x-1/2">
          <div class="h-16 w-0.5 bg-[#8D6E63]"></div>
          <div class="w-20 h-10 bg-[#FFECB3] border-2 border-[#FFCA28] rounded-b-2xl flex items-center justify-center text-3xl shadow-sm">
            <!-- Render Items -->
            {{ ICON_MAP[props.data.left.type] }}
            <span v-if="props.data.left.count > 1" class="text-xs font-bold text-brown-600 absolute -bottom-4"
              >x{{ props.data.left.count }}</span
            >
          </div>
        </div>

        <!-- Right Pan -->
        <div class="absolute right-0 top-1 flex flex-col items-center translate-x-1/2">
          <div class="h-16 w-0.5 bg-[#8D6E63]"></div>
          <div class="w-20 h-10 bg-[#FFECB3] border-2 border-[#FFCA28] rounded-b-2xl flex items-center justify-center text-3xl shadow-sm">
            {{ ICON_MAP[props.data.right.type] }}
            <span v-if="props.data.right.count > 1" class="text-xs font-bold text-brown-600 absolute -bottom-4"
              >x{{ props.data.right.count }}</span
            >
          </div>
        </div>
      </div>

      <!-- Pivot -->
      <div class="absolute top-8 w-4 h-4 bg-[#FFCA28] rounded-full border-2 border-[#5D4037] z-20 shadow-md"></div>
    </div>

    <!-- Options -->
    <div class="grid grid-cols-2 gap-6 w-full px-4">
      <button class="btn-option bg-blue-50 text-blue-600 border-blue-200" @click="check('left')">⬅️ 左边重</button>
      <button class="btn-option bg-red-50 text-red-600 border-red-200" @click="check('right')">右边重 ➡️</button>
    </div>
  </div>
</template>

<style scoped>
.btn-option {
  @apply py-4 rounded-xl font-bold text-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all;
}
</style>
