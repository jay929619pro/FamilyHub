<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useSudokuSocket } from "../composables/useSudokuSocket";
import { useSudokuStore } from "../store/sudoku";
import { storeToRefs } from "pinia";
import { Dialog, Snackbar } from "@varlet/ui";

// === State ===
const store = useSudokuStore();
const { players, currentBoard, initialBoard, status, size, difficulty, focusMap } = storeToRefs(store);
const { connect, disconnect } = useSudokuSocket();
let socket;

// Local UI State
const selectedCell = ref({ row: -1, col: -1 });
const myName = ref(localStorage.getItem("family_hub_name") || "Player");

// === Icons Mapping ===
// 4x4 -> Fruits. 5x5/6x6 -> Numbers.
const FRUIT_MAP = { 1: "🍎", 2: "🍌", 3: "🍇", 4: "🍊", 5: "🍓", 6: "🍍" };
const isFruitMode = computed(() => size.value === 4 && difficulty.value === "easy");
const displaySymbols = computed(() => (isFruitMode.value ? FRUIT_MAP : { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 }));

// === Compute Grid Layout ===
const gridTemplateStyle = computed(() => {
  return {
    gridTemplateColumns: `repeat(${size.value}, minmax(0, 1fr))`,
    gap: "4px"
  };
});

// === Actions ===
function joinGame() {
  if (!myName.value) return;
  if (socket && socket.connected) {
    socket.emit("join_game", { name: myName.value });
  }
}

function startGame(levelSize, levelDiff) {
  // Reset local selection
  selectedCell.value = { row: -1, col: -1 };
  socket.emit("start_game", { size: levelSize, difficulty: levelDiff });
}

function onCellClick(r, c) {
  selectedCell.value = { row: r, col: c };
  socket.emit("update_focus", { row: r, col: c });
}

function onKeypadClick(num) {
  if (status.value !== "playing") return;
  const { row, col } = selectedCell.value;
  if (row === -1) {
    Snackbar.warning("请先点击格子！");
    return;
  }

  if (!initialBoard.value[row]) return;
  if (initialBoard.value[row][col] !== 0) {
    Snackbar.warning("这个格子不能改哦！");
    selectedCell.value = { row: -1, col: -1 };
    return;
  }

  store.setCell(row, col, num);
  socket.emit("make_move", { row, col, val: num });
}

function onClearCell() {
  const { row, col } = selectedCell.value;
  if (row === -1) return;
  if (!initialBoard.value[row]) return;
  if (initialBoard.value[row][col] !== 0) return;

  store.setCell(row, col, 0);
  socket.emit("make_move", { row, col, val: 0 });
}

function isRelated(r, c) {
  const { row: sr, col: sc } = selectedCell.value;
  if (sr === -1) return false;
  if (r === sr || c === sc) return true;

  // Box checks for highlighting
  if (size.value === 5) return false; // 5x5 has no boxes basically, or rows/cols only

  let boxH = 2;
  let boxW = 2;

  if (size.value === 4) {
    boxH = 2;
    boxW = 2;
  } else if (size.value === 6) {
    boxH = 2;
    boxW = 3;
  }

  const startRow = Math.floor(sr / boxH) * boxH;
  const startCol = Math.floor(sc / boxW) * boxW;

  return r >= startRow && r < startRow + boxH && c >= startCol && c < startCol + boxW;
}

function getCellClass(cIndex) {
  if (!initialBoard.value || initialBoard.value.length === 0) return "";
  if (!size.value) return "";

  const r = Math.floor(cIndex / size.value);
  const c = cIndex % size.value;

  if (!initialBoard.value[r]) return "";

  const isInit = initialBoard.value[r][c] !== 0;
  const isSel = selectedCell.value.row === r && selectedCell.value.col === c;
  const related = isRelated(r, c);

  let cls = "border border-gray-100 ";

  if (isInit) cls += "bg-cyan-50 text-slate-800 ";
  else cls += "bg-white text-blue-600 ";

  if (isSel) cls += "!bg-yellow-300 transform scale-105 shadow-md z-10 ring-2 ring-yellow-400 ";
  else if (related) cls += "!bg-cyan-50/50 ";

  return cls;
}

function getIsInit(cIndex) {
  if (!initialBoard.value || initialBoard.value.length === 0) return false;
  const r = Math.floor(cIndex / size.value);
  const c = cIndex % size.value;
  if (!initialBoard.value[r]) return false;
  return initialBoard.value[r][c] !== 0;
}

function confirmExit() {
  Dialog({
    title: "切换难度",
    message: "确定要结束本局，重新选择关卡吗？",
    confirmButtonText: "确定切换",
    cancelButtonText: "继续挑战",
    closeOnClickOverlay: false
  }).then(action => {
    if (action === "confirm") {
      store.resetGame();
    }
  });
}

// === Lifecycle ===
onMounted(() => {
  store.resetGame();

  socket = connect();

  socket.on("connect", () => {
    joinGame();
  });

  if (socket.connected) {
    joinGame();
  }
});

onUnmounted(() => {
  disconnect();
});

watch(status, val => {
  if (val === "win") {
    setTimeout(() => {
      Dialog({
        title: "🎉 挑战成功！",
        message: "恭喜宝宝完成了挑战！太厉害了！",
        confirmButtonText: "再玩一局",
        cancelButtonText: "返回",
        closeOnClickOverlay: false
      }).then(action => {
        if (action === "confirm") {
          store.resetGame();
        } else {
          store.resetGame();
        }
      });
    }, 500);
  }
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-[#e0f7fa] overflow-hidden select-none font-sans">
    <!-- Header -->
    <var-app-bar color="white" text-color="#006064" elevation="1" title-position="center" :safe-area-top="true">
      <template #left>
        <var-button round text color="transparent" text-color="#006064" @click="$router.push('/')">
          <var-icon name="home-outline" size="24" />
        </var-button>
      </template>
      <template #default>
        <span class="font-bold tracking-widest text-lg">数独大冒险</span>
      </template>
      <template #right>
        <var-button v-if="status === 'playing'" round text color="transparent" text-color="#006064" @click="confirmExit">
          <span class="text-sm font-bold">切换难度</span>
        </var-button>
      </template>
    </var-app-bar>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col p-4 w-full max-w-lg mx-auto overflow-y-auto no-scrollbar">
      <!-- Players Bar -->
      <div class="flex justify-center gap-3 mb-4 min-h-[50px]">
        <div v-for="p in players" :key="p.id" class="flex flex-col items-center">
          <var-avatar
            size="small"
            :class="{ 'ring-2 ring-orange-400': focusMap[p.id] }"
            style="background: #b2ebf2; color: #006064; font-weight: bold"
          >
            {{ p.name.slice(-1) }}
          </var-avatar>
          <span v-if="focusMap[p.id]" class="text-[10px] text-gray-400"> {{ focusMap[p.id].row + 1 }},{{ focusMap[p.id].col + 1 }} </span>
        </div>
      </div>

      <!-- Lobby: Level Selection -->
      <div v-if="status === 'waiting'" class="flex flex-col gap-4 mt-8">
        <var-paper :elevation="2" radius="10" class="p-6 text-center bg-white/80">
          <h2 class="text-2xl font-black text-cyan-600 mb-6">选择关卡</h2>

          <var-button block color="#4caf50" text-color="white" size="large" class="mb-4 font-bold text-xl" @click="startGame(4, 'easy')">
            Level 1: 4x4 水果乐园 🍎
            <span class="text-xs ml-2 opacity-80">(入门)</span>
          </var-button>

          <var-button block color="#2196f3" text-color="white" size="large" class="mb-4 font-bold text-xl" @click="startGame(5, 'medium')">
            Level 2: 5x5 数字挑战 🔢
            <span class="text-xs ml-2 opacity-80">(进阶)</span>
          </var-button>

          <var-button block color="#9c27b0" text-color="white" size="large" class="font-bold text-xl" @click="startGame(6, 'hard')">
            Level 3: 6x6 用心算数 🎓
            <span class="text-xs ml-2 opacity-80">(大师)</span>
          </var-button>
        </var-paper>
      </div>

      <!-- Game Board -->
      <div v-else class="flex-1 flex flex-col items-center justify-center">
        <div class="w-full bg-white p-2 rounded-xl shadow-lg border-4 border-cyan-100 relative">
          <!-- The Grid -->
          <div class="grid w-full h-full aspect-square" :style="gridTemplateStyle">
            <div
              v-for="(cellVal, cIndex) in currentBoard.flat()"
              :key="cIndex"
              class="relative flex items-center justify-center text-3xl font-bold cursor-pointer transition-all duration-100 rounded-md select-none"
              :class="getCellClass(cIndex)"
              @click="onCellClick(Math.floor(cIndex / size), cIndex % size)"
            >
              {{ displaySymbols[cellVal] || "" }}
              <span v-if="!getIsInit(cIndex) && cellVal === 0" class="absolute text-gray-100 text-sm">?</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer: Keypad -->
    <div v-if="status === 'playing'" class="bg-white px-4 py-4 pb-8 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
      <div class="grid grid-cols-4 gap-3 max-w-lg mx-auto">
        <var-button
          v-for="num in size"
          :key="num"
          rotation
          :color="isFruitMode ? '#fff3e0' : '#e3f2fd'"
          :text-color="isFruitMode ? '#e65100' : '#1565c0'"
          class="text-2xl font-bold shadow-sm h-14"
          @click="onKeypadClick(num)"
        >
          {{ displaySymbols[num] }}
        </var-button>

        <var-button color="#ffebee" text-color="#c62828" class="text-xl h-14 col-span-2" @click="onClearCell">
          <var-icon name="eraser" /> 橡皮擦
        </var-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
