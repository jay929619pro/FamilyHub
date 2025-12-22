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
    <van-dialog v-model:show="showProfileEdit" title="给自己起个名字" show-cancel-button @confirm="saveProfile">
      <div class="p-6 flex flex-col items-center">
        <div class="flex space-x-4 mb-6">
          <button
            v-for="emoji in avatars"
            :key="emoji"
            class="text-4xl p-2 rounded-xl border-2 transition-all"
            :class="tempAvatar === emoji ? 'border-family-primary bg-orange-50' : 'border-transparent hover:bg-gray-100'"
            @click="tempAvatar = emoji"
          >
            {{ emoji }}
          </button>
        </div>
        <van-field v-model="tempName" placeholder="例如：画画小能手" border class="bg-gray-50 rounded-lg" input-align="center" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useGameStore } from "@/stores/game";
import { useSync } from "@/apps/DrawAndGuess/composables/useSync";

const gameStore = useGameStore();
const { sendUpdateProfile } = useSync();

const showProfileEdit = ref(false);
const avatars = ["🐶", "🐱", "🦁", "🦊", "🐼", "🐰"];
const tempName = ref("");
const tempAvatar = ref("🐶");

const myProfile = computed(() => {
  return gameStore.players.find(p => p.id === gameStore.myPlayerId);
});

onMounted(() => {
  // Check if we need to set profile
  const stored = localStorage.getItem("family-hub-profile");
  if (stored) {
    try {
      const { name, avatar } = JSON.parse(stored);
      if (name) {
        tempName.value = name;
        tempAvatar.value = avatar;
        // Auto-login with stored profile
        sendUpdateProfile(name, avatar);
        gameStore.setProfile(name, avatar);
      }
    } catch (e) {
      console.error("Failed to load profile", e);
    }
  }

  // Checking if profile is still default "User ..."
  // If we just restored from localStorage, myProfile might still be undefined until next tick or server response
  // But we optimistically set it in gameStore above.

  // Give a small delay or check store directly
  setTimeout(() => {
    const currentName = gameStore.players.find(p => p.id === gameStore.myPlayerId)?.name;
    if (!currentName || currentName.startsWith("User ")) {
      // Only show dialog if we didn't successfully restore a valid name
      if (!tempName.value) {
        showProfileEdit.value = true;
      }
    }
  }, 500);
});

function saveProfile() {
  if (!tempName.value) tempName.value = `玩家${Math.floor(Math.random() * 1000)}`;

  // Save to local storage
  localStorage.setItem(
    "family-hub-profile",
    JSON.stringify({
      name: tempName.value,
      avatar: tempAvatar.value
    })
  );

  sendUpdateProfile(tempName.value, tempAvatar.value);
  gameStore.setProfile(tempName.value, tempAvatar.value);
}
</script>
