<template>
  <div class="h-full w-full flex flex-col items-center justify-center p-8 relative">
    <h1 class="text-3xl font-bold mb-8 text-family-primary">今天玩点什么？</h1>

    <!-- User Info Card -->
    <div
      v-if="myProfile"
      class="absolute top-4 right-4 flex items-center bg-white px-3 py-1 rounded-full shadow-sm cursor-pointer"
      @click="showProfileEdit = true"
    >
      <span class="text-2xl mr-2">{{ myProfile.avatar || "😊" }}</span>
      <span class="font-bold text-gray-700">{{ myProfile.name }}</span>
    </div>

    <div class="flex space-x-6 overflow-x-auto pb-8 w-full justify-center">
      <!-- Game Card: Draw & Guess -->
      <router-link
        to="/apps/draw-guess"
        class="group relative w-64 h-80 bg-white rounded-3xl shadow-lg border-4 border-transparent hover:border-family-primary transition-all duration-300 transform hover:-translate-y-2 flex flex-col overflow-hidden cursor-pointer"
      >
        <div class="flex-1 bg-orange-100 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-300">
          🎨
        </div>
        <div class="h-20 bg-white p-4 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-lg text-gray-800">你画我猜</h3>
            <p class="text-xs text-gray-500">发挥你的灵魂画技！</p>
          </div>
          <div class="w-8 h-8 rounded-full bg-family-primary text-white flex items-center justify-center">GO</div>
        </div>
      </router-link>

      <!-- Placeholder: More Games -->
      <div
        class="w-64 h-80 bg-gray-100/50 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400"
      >
        <span class="text-4xl mb-2">➕</span>
        <span>敬请期待</span>
      </div>
    </div>

    <!-- Profile Setup Dialog -->
    <van-dialog v-model:show="showProfileEdit" title="我是谁？" :show-confirm-button="false" :close-on-click-overlay="false">
      <div class="p-6">
        <div class="grid grid-cols-4 gap-4">
          <button
            v-for="role in presetRoles"
            :key="role.name"
            class="flex flex-col items-center p-3 rounded-xl transition-all hover:bg-orange-50 active:scale-95"
            @click="selectRole(role)"
          >
            <span class="text-4xl mb-2">{{ role.avatar }}</span>
            <span class="text-sm font-bold text-gray-700">{{ role.name }}</span>
          </button>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useGameStore } from "@/stores/game";
import { useSync } from "@/apps/DrawAndGuess/composables/useSync";

const gameStore = useGameStore();
const { sendUpdateProfile } = useSync();

const showProfileEdit = ref(false);

const presetRoles = [
  { name: "爸爸", avatar: "👨" },
  { name: "妈妈", avatar: "👩" },
  { name: "宝宝", avatar: "👶" },
  { name: "舅舅", avatar: "🧔" }
];

const myProfile = computed(() => {
  return gameStore.players.find(p => p.id === gameStore.myPlayerId);
});

// Store cleanup function
let cleanupListeners = null;

onMounted(() => {
  // 1. Initialize Sync to get myPlayerId and update store
  cleanupListeners = useSync().initListeners();

  // 2. Check Local Storage for immediate UI decision
  const stored = localStorage.getItem("family-hub-profile");
  let hasLocalProfile = false;

  if (stored) {
    try {
      const { name } = JSON.parse(stored);
      if (name) hasLocalProfile = true;
    } catch (e) {}
  }

  // 3. Only show dialog if we definitely don't have a profile
  if (!hasLocalProfile) {
    // Wait a bit to see if server has info (edge case), basically redundant if local is missing
    // But let's just show it immediately if local is missing
    showProfileEdit.value = true;
  }
});

onBeforeUnmount(() => {
  if (cleanupListeners) cleanupListeners();
});

function selectRole(role) {
  // Save to local storage
  localStorage.setItem("family-hub-profile", JSON.stringify(role));

  sendUpdateProfile(role.name, role.avatar);
  gameStore.setProfile(role.name, role.avatar);

  showProfileEdit.value = false;
}
</script>
