<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4"
  >
    <div class="flex items-center space-x-3 overflow-x-auto no-scrollbar">
      <div
        v-for="member in members"
        :key="member.id"
        class="relative flex-shrink-0"
      >
        <div
          class="w-10 h-10 rounded-full bg-family-primary/20 flex items-center justify-center text-xl border-2 border-white shadow-sm"
        >
          {{ member.avatar || "😊" }}
        </div>
        <div
          class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
        ></div>
      </div>
    </div>

    <button
      class="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100"
    >
      <span class="text-xl">⚙️</span>
    </button>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { useFamilyStore } from "../stores/family";

const store = useFamilyStore();
const members = computed(() => store.roomState.members);
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
