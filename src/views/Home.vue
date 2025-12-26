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
  },
  {
    id: "sudoku",
    title: "🔢 数独大冒险",
    desc: "全家动脑，帮宝宝一起闯关！",
    color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    icon: "calendar-month",
    path: "/sudoku"
  },
  {
    id: "logic-master",
    title: "🧠 逻辑大师",
    desc: "代数天平、找规律...全脑开发！",
    color: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    icon: "notebook",
    path: "/logic"
  }
];

function navigateTo(path) {
  router.push(path);
}
</script>

<template>
  <!-- Fixed viewport container -->
  <div class="h-screen w-screen bg-[#fffbf0] flex flex-col overflow-hidden">
    <!-- Static Header -->
    <header class="mt-10 mb-6 px-6 shrink-0">
      <h1 class="text-3xl font-black text-gray-800 mb-2">家庭游戏大厅</h1>
      <p class="text-gray-500 font-medium tracking-wide">Family Game Hub</p>
    </header>

    <!-- Scrollable Game List -->
    <!-- flex-1 fills remaining height, overflow-y-auto enables internal scroll -->
    <div class="flex-1 flex flex-col gap-6 px-6 overflow-y-auto overscroll-contain pb-safe">
      <div
        v-for="game in games"
        :key="game.id"
        class="relative overflow-hidden rounded-3xl shadow-lg active:scale-95 transition-transform duration-200 cursor-pointer shrink-0"
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

      <!-- Footer Info -->
      <footer class="text-center py-6 text-gray-300 text-xs shrink-0">Made with ❤️ by Family</footer>

      <!-- Safe Area Spacer -->
      <div class="h-4 shrink-0"></div>
    </div>
  </div>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
