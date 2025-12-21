<template>
  <div class="relative w-full h-full touch-none select-none" ref="containerRef">
    <svg
      class="absolute inset-0 w-full h-full"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
    >
      <!-- Remote Strokes -->
      <path
        v-for="(stroke, id) in otherStrokes"
        :key="id"
        :d="stroke.path"
        :fill="stroke.color"
      />
      <!-- Current Stroke -->
      <path v-if="currentPath" :d="currentPath" fill="#333" />
    </svg>
  </div>
</template>

<script setup>
import { ref, computation, onMounted, onUnmounted } from "vue";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../../../utils/canvas";
import { useGameBridge } from "../../../core/useGameBridge";

const { sendAction, onAction } = useGameBridge();
const APP_ID = "draw-guess";

const props = defineProps(["isDrawer"]);

// State
const points = ref([]);
const otherStrokes = ref({}); // { userId: { path: '', color: '' } }
const isDrawing = ref(false);

// Computed Current Path
import { computed } from "vue";
const currentPath = computed(() => {
  if (points.value.length === 0) return "";
  return getSvgPathFromStroke(points.value, {
    size: 8,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
  });
});

// Event Handlers
function handlePointerDown(e) {
  if (!props.isDrawer) return;
  e.target.setPointerCapture(e.pointerId);
  isDrawing.value = true;
  const point = [e.pageX, e.pageY, e.pressure];
  points.value = [point];
  sendAction(APP_ID, "stroke-start", point);
}

function handlePointerMove(e) {
  if (!isDrawing.value) return;
  const point = [e.pageX, e.pageY, e.pressure];
  points.value = [...points.value, point];
  // In a real app, you might want to throttle this or send chunks
  sendAction(APP_ID, "stroke-move", point);
}

function handlePointerUp(e) {
  if (!isDrawing.value) return;
  isDrawing.value = false;
  sendAction(APP_ID, "stroke-end", {});
  // Commit stroke to "otherStrokes" or local history if needed
  // For simplicity, we just clear for now or keep it until round ends
  points.value = [];
}

// Remote Events
const cleanup = [];
onMounted(() => {
  cleanup.push(
    onAction(APP_ID, "stroke-start", (payload) => {
      // Handle remote start
      // ... Implementation for multi-user strokes needs separating remote users
    }),
    onAction(APP_ID, "stroke-move", (payload) => {
      // Handle remote move
    })
  );
});
</script>
