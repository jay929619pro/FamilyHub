<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const games = [
  {
    id: "draw-guess",
    title: "🎨 你画我猜",
    desc: "发挥你的灵魂画技，让家人来猜猜看！",
    color: "linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)",
    icon: "palette",
    path: "/draw-guess"
  },
  {
    id: "charades",
    title: "💃 你比我猜",
    desc: "不仅要动脑，还要动起来！",
    color: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    icon: "twitter",
    path: "/charades"
  }
];

function navigateTo(path) {
  router.push(path);
}
</script>

<template>
  <div class="min-h-screen bg-[#fffbf0] flex flex-col p-6">
    <!-- Header -->
    <header class="mb-8 mt-10">
      <h1 class="text-3xl font-black text-gray-800 mb-2">家庭游戏大厅</h1>
      <p class="text-gray-500 font-medium tracking-wide">Family Game Hub</p>
    </header>

    <!-- Game List -->
    <div class="flex-1 flex flex-col gap-6">
      <div
        v-for="game in games"
        :key="game.id"
        class="relative overflow-hidden rounded-3xl shadow-lg active:scale-95 transition-transform duration-200 cursor-pointer"
        :style="{ background: game.color }"
        @click="navigateTo(game.path)"
      >
        <!-- Background Decor -->
        <var-icon :name="game.icon" class="absolute -right-4 -bottom-4 opacity-20 rotate-12" size="120" color="white" />

        <div class="p-6 relative z-10 text-white">
          <div class="flex items-center gap-3 mb-3">
            <div class="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <var-icon :name="game.icon" size="28" />
            </div>
            <h2 class="text-2xl font-bold tracking-wider">{{ game.title }}</h2>
          </div>
          <p class="text-white/90 font-medium text-sm leading-relaxed pr-8">
            {{ game.desc }}
          </p>
        </div>
      </div>
    </div>

    <!-- Footer Info -->
    <footer class="text-center py-6 text-gray-300 text-xs">Made with ❤️ by Family</footer>
  </div>
</template>
