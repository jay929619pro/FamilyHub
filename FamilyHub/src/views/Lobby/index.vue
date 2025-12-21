<template>
  <div class="h-full w-full flex flex-col items-center justify-center p-8">
    <h1 class="text-3xl font-bold mb-8 text-family-primary">今天玩点什么？</h1>

    <div class="flex space-x-6 overflow-x-auto pb-8 w-full justify-center">
      <!-- Game Card: Draw & Guess -->
      <router-link
        to="/apps/draw-guess"
        class="group relative w-64 h-80 bg-white rounded-3xl shadow-lg border-4 border-transparent hover:border-family-primary transition-all duration-300 transform hover:-translate-y-2 flex flex-col overflow-hidden cursor-pointer"
      >
        <div
          class="flex-1 bg-orange-100 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-300"
        >
          🎨
        </div>
        <div class="h-20 bg-white p-4 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-lg text-gray-800">你画我猜</h3>
            <p class="text-xs text-gray-500">发挥你的灵魂画技！</p>
          </div>
          <div
            class="w-8 h-8 rounded-full bg-family-primary text-white flex items-center justify-center"
          >
            GO
          </div>
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
  </div>
</template>

<script setup>
// Lobby logic if needed
</script>
