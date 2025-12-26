<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps(["data"]); // { sequence: [], options: [], answer: '' }
const emit = defineEmits(["answer"]);

function selectOption(opt) {
  emit("answer", opt === props.data.answer);
}
</script>

<template>
  <div class="w-full flex flex-col items-center">
    <!-- Sequence Display -->
    <div class="flex gap-2 mb-10 p-4 bg-gray-50 rounded-2xl border-dashed border-2 border-gray-300 flex-wrap justify-center">
      <div
        v-for="(item, idx) in props.data.sequence"
        :key="idx"
        class="w-14 h-14 flex items-center justify-center text-4xl bg-white rounded-xl shadow-sm border border-gray-100"
        :class="{ 'animate-pulse bg-yellow-50 border-yellow-300': item === '?' }"
      >
        {{ item }}
      </div>
    </div>

    <!-- Options -->
    <div class="flex gap-4">
      <button
        v-for="(opt, idx) in props.data.options"
        :key="idx"
        class="w-20 h-20 bg-white border-b-4 border-gray-200 rounded-2xl text-4xl hover:bg-green-50 hover:border-green-300 hover:scale-105 transition-all text-center flex items-center justify-center shadow-sm"
        @click="selectOption(opt)"
      >
        {{ opt }}
      </button>
    </div>
  </div>
</template>
