<template>
  <div class="w-full h-full bg-white relative" ref="containerRef">
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @mousedown="handleStart"
      @touchstart="handleStart"
      @mousemove="handleMove"
      @touchmove="handleMove"
      @mouseup="handleEnd"
      @touchend="handleEnd"
      @mouseleave="handleEnd"
    >
      <v-layer>
        <!-- Completed Lines -->
        <v-path
          v-for="line in store.lines"
          :key="line.id"
          :config="{
            data: getPath(line),
            fill: line.color,
            listening: false
          }"
        />

        <!-- Current Active Line -->
        <v-path
          v-if="store.isDrawing && currentPoints.length > 0"
          :config="{
            data: currentPathData,
            fill: store.currentColor,
            listening: false
          }"
        />
      </v-layer>
    </v-stage>
    <div
      v-if="props.isDrawer"
      class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100 z-30"
    >
      <!-- Colors -->
      <button
        v-for="color in colors"
        :key="color"
        class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 shadow-sm"
        :class="{
          'border-gray-200': store.currentColor !== color,
          '!border-gray-800 scale-110 ring-1 ring-gray-300': store.currentColor === color
        }"
        :style="{ backgroundColor: color }"
        @click="selectColor(color)"
      ></button>

      <div class="w-px h-6 bg-gray-200 mx-2"></div>

      <!-- Eraser -->
      <button
        class="w-8 h-8 rounded-full border-2 bg-gray-100 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm text-sm"
        :class="{ 'border-gray-200': !isEraser, '!border-gray-800 scale-110 ring-1 ring-gray-300': isEraser }"
        @click="selectEraser"
        title="橡皮擦"
      >
        🧽
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, shallowRef } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useDrawingStore } from "@/stores/drawing";
import { useSync } from "../composables/useSync";
import { pointsToPath } from "@/utils/drawing";

const props = defineProps(["isDrawer"]);
const containerRef = ref(null);

// Store & Composables
const store = useDrawingStore();
const { broadcastStart, broadcastMove, broadcastEnd, initListeners } = useSync();
const { width, height } = useWindowSize();

// Colors
const colors = ["#000000", "#FF3B30", "#007AFF", "#4CD964", "#FF9F43", "#8E44AD"];

const isEraser = computed(() => store.currentColor === "#ffffff");

function selectColor(color) {
  store.currentColor = color;
  store.currentWidth = 5;
}

function selectEraser() {
  store.currentColor = "#ffffff";
  store.currentWidth = 20;
}

// Stage Config
const stageConfig = ref({
  width: 500,
  height: 500
});

// Local State for Active Stroke
const currentPoints = shallowRef([]); // [x,y, x,y...]

const currentPathData = computed(() => {
  return pointsToPath(currentPoints.value, {
    size: store.currentWidth,
    simulatePressure: false
  });
});

const getPath = line => {
  return pointsToPath(line.points, {
    size: line.strokeWidth,
    simulatePressure: false
  });
};

// Update stage size on window resize
watch([width, height], () => {
  if (containerRef.value) {
    stageConfig.value.width = containerRef.value.clientWidth;
    stageConfig.value.height = containerRef.value.clientHeight;
  }
});

onMounted(() => {
  if (containerRef.value) {
    stageConfig.value.width = containerRef.value.clientWidth;
    stageConfig.value.height = containerRef.value.clientHeight;
  }

  initListeners();
});

// --- Interaction Handlers ---

function getPointerPosition(e) {
  const stage = e.target.getStage();
  return stage.getPointerPosition();
}

function handleStart(e) {
  if (!props.isDrawer) return;

  if (e.evt.type === "touchstart") {
    e.evt.preventDefault();
  }

  const pos = getPointerPosition(e);
  if (!pos) return;

  // Start logic
  const newLineConfig = store.startLine(pos);
  currentPoints.value = [pos.x, pos.y];

  broadcastStart(newLineConfig);
}

function handleMove(e) {
  if (!store.isDrawing || !props.isDrawer) return;

  if (e.evt.type === "touchmove") {
    e.evt.preventDefault();
  }

  const pos = getPointerPosition(e);
  if (!pos) return;

  // Update local visual immediately (Vue Reactive)
  // Creating a new array to trigger reactivity for shallowRef
  currentPoints.value = [...currentPoints.value, pos.x, pos.y];

  // Broadcast
  broadcastMove(store.currentLineId, pos);
}

function handleEnd() {
  if (!store.isDrawing || !props.isDrawer) return;

  // Commit to store
  const lineConfig = {
    id: store.currentLineId,
    points: currentPoints.value,
    color: store.currentColor,
    strokeWidth: store.currentWidth
  };
  store.addLine(lineConfig);

  const lineId = store.currentLineId;
  store.endLine();
  currentPoints.value = []; // clear local

  broadcastEnd(lineId);
}
</script>
