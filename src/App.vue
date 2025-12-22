<script setup>
import { ref, computed, onMounted } from "vue";
import { useSocket } from "./composables/useSocket";
import { useGameStore } from "./store/game";
import { storeToRefs } from "pinia";
import { pinyin } from "pinyin-pro";
import { Dialog, Snackbar } from "@varlet/ui";
import GameBoard from "./components/GameBoard.vue";

// === 状态管理 ===
const gameStore = useGameStore();
const { players, currentDrawerId, currentWord, scores } = storeToRefs(gameStore);
const { connect, getSocket } = useSocket();
const socket = connect(); // 获取 Socket 实例

// === 本地状态 ===
const myName = ref("");
const showRoleSelect = ref(true);
const predefinedRoles = ["爸爸", "妈妈", "舅舅", "宝宝"];

// === 计算属性 ===
// 是否是画手
const isDrawer = computed(() => {
  return socket?.id && currentDrawerId.value === socket.id;
});

// 带有拼音的题目 HTML (仅画手显示)
const wordWithPinyin = computed(() => {
  if (!currentWord.value) return "等待题目...";
  // 使用 pinyin-pro 生成带拼音的结构
  // result 格式示例: pín guǒ
  const py = pinyin(currentWord.value, { type: "string", toneType: "symbol" });
  return { word: currentWord.value, py };
});

// === 核心交互 ===

// 1. 选择角色并登录
function selectRole(role) {
  myName.value = role;
  showRoleSelect.value = false;

  // 发送加入游戏事件
  socket.emit("join_game", { name: role });
  Snackbar.success(`欢迎, ${role}!`);
}

// 2. 模拟开始/切题 (实际应由服务端状态控制，这里为了演示加个临时入口)
function requestNewRound() {
  if (isDrawer.value) {
    socket.emit("next_round");
  }
}

// 3. 给某人加分 (仅画手可用)
function addScore(playerId) {
  if (!isDrawer.value) return;
  socket.emit("add_score", { playerId, amount: 10 });
  Snackbar.info("加分成功! +10");
}

// === 样式配置 ===
// 不同角色的头像颜色映射 (Varlet 风格)
const roleColors = {
  爸爸: "linear-gradient(to right, #2980b9, #6dd5fa)",
  妈妈: "linear-gradient(to right, #ff9966, #ff5e62)",
  舅舅: "linear-gradient(to right, #11998e, #38ef7d)",
  宝宝: "linear-gradient(to right, #f7b733, #fc4a1a)"
};

const getAvatarColor = name => roleColors[name] || "#ccc";

onMounted(() => {
  // 简单的重连提示
  socket.on("connect", () => {
    // 如果已经选过角色，重连后可能需要重新加入
    if (myName.value) {
      socket.emit("join_game", { name: myName.value });
    }
  });
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-amber-50 overflow-hidden select-none">
    <!-- 1. 顶部栏 (题目显示) -->
    <header class="h-16 flex items-center justify-between px-4 bg-white shadow-sm z-10">
      <div class="flex flex-col justify-center">
        <!-- 仅画手能看到题目 -->
        <template v-if="isDrawer">
          <span class="text-xs text-gray-400 font-mono tracking-wide">{{ wordWithPinyin.py }}</span>
          <span class="text-xl font-bold text-gray-800 tracking-widest">{{ wordWithPinyin.word }}</span>
        </template>
        <template v-else>
          <span class="text-lg text-gray-500 font-medium">
            {{ currentDrawerId ? "猜猜他在画什么?" : "等待游戏开始" }}
          </span>
        </template>
      </div>

      <!-- 状态指示 -->
      <div class="flex items-center gap-2">
        <var-chip :type="isDrawer ? 'primary' : 'default'" size="small">
          {{ isDrawer ? "你是画家 🖌️" : "猜题中 👀" }}
        </var-chip>
      </div>
    </header>

    <!-- 2. 中间画板 (自适应高度) -->
    <main class="flex-1 w-full relative bg-white m-2 border-2 border-amber-200 rounded-xl overflow-hidden shadow-inner">
      <GameBoard :is-drawer="isDrawer" stroke-color="#333" :stroke-width="6" />

      <!-- 只有画手能看见的"切题"按钮 (悬浮) -->
      <div v-if="isDrawer" class="absolute top-2 left-2 opacity-80">
        <var-button round size="mini" type="warning" @click="requestNewRound">换一题</var-button>
      </div>
    </main>

    <!-- 3. 底部成员列表 (加分控制) -->
    <footer class="h-24 bg-white border-t border-amber-100 flex items-center px-2 overflow-x-auto gap-3">
      <transition-group name="list" tag="div" class="flex gap-3 w-full px-2">
        <div v-for="p in players" :key="p.id" class="flex flex-col items-center min-w-[60px] relative transition-all">
          <!-- 头像 -->
          <div class="relative">
            <var-avatar
              size="large"
              :style="{ background: getAvatarColor(p.name) }"
              class="border-2 border-white shadow-md font-bold text-white text-sm"
            >
              {{ p.name }}
            </var-avatar>

            <!-- 当前画手标识小图标 -->
            <div
              v-if="p.id === currentDrawerId"
              class="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-[2px] shadow-sm animate-bounce"
            >
              🖌️
            </div>
          </div>

          <!-- 分数 & 名字 -->
          <div class="text-center mt-1 leading-tight">
            <div class="text-[10px] text-gray-400">{{ p.name }}</div>
            <div class="font-bold text-amber-600 font-mono">{{ scores[p.id] || 0 }}</div>
          </div>

          <!-- 画家特权：加分按钮 (不可以给自己加) -->
          <div v-if="isDrawer && p.id !== socket.id" class="absolute -top-4 w-full flex justify-center">
            <var-button round color="#ff9f43" text-color="#fff" size="mini" elevation="2" @click="addScore(p.id)"> +10 </var-button>
          </div>
        </div>
      </transition-group>

      <div v-if="players.length === 0" class="w-full text-center text-gray-300 text-sm">这里空空如也...</div>
    </footer>

    <!-- 4. 角色选择弹窗 (强制) -->
    <var-popup :show="showRoleSelect" :close-on-click-overlay="false" class="rounded-xl p-6 w-4/5 max-w-sm">
      <div class="text-center">
        <h3 class="text-lg font-bold text-gray-700 mb-6">我是谁?</h3>
        <div class="grid grid-cols-2 gap-4">
          <var-button
            v-for="role in predefinedRoles"
            :key="role"
            block
            size="large"
            :style="{ background: getAvatarColor(role), color: 'white' }"
            class="shadow-md"
            @click="selectRole(role)"
          >
            {{ role }}
          </var-button>
        </div>
      </div>
    </var-popup>
  </div>
</template>

<style>
/* 列表过渡动画 */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
