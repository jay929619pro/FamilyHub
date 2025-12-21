<template>
  <div
    class="relative w-full h-full touch-none select-none bg-white cursor-crosshair"
  >
    <canvas
      ref="canvasRef"
      class="block w-full h-full"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
    ></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef, watch } from "vue";
import { useWindowSize, useDevicePixelRatio } from "@vueuse/core";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "../../../utils/canvas";
import { useGameBridge } from "../../../core/useGameBridge";

const props = defineProps(["isDrawer"]);

// Setup
const canvasRef = ref(null);
const { width, height } = useWindowSize();
const { pixelRatio } = useDevicePixelRatio();
const { sendAction, onAction } = useGameBridge();
const APP_ID = "draw-guess";

// Data (Using shallowRef for performance)
const currentPoints = shallowRef([]);
const otherStrokes = shallowRef([]); // Array of { points: [], color: '' }
const ctx = shallowRef(null);
const isDrawing = ref(false);

// Formatting
const strokeOptions = {
  size: 8,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
};

// Render Loop
let animationFrameId;
function render() {
  if (!ctx.value || !canvasRef.value) return;

  // Clear
  ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);

  // Draw Others
  otherStrokes.value.forEach((stroke) => {
    const strokePath = getSvgPathFromStroke(stroke.points, strokeOptions);
    const p = new Path2D(strokePath);
    ctx.value.fillStyle = stroke.color || "#000";
    ctx.value.fill(p);
  });

  // Draw Current
  if (currentPoints.value.length > 0) {
    const strokePath = getSvgPathFromStroke(currentPoints.value, strokeOptions);
    const p = new Path2D(strokePath);
    ctx.value.fillStyle = "#333";
    ctx.value.fill(p);
  }

  animationFrameId = requestAnimationFrame(render);
}

// Resize Handling
watch([width, height, pixelRatio], () => {
  if (canvasRef.value) {
    canvasRef.value.width = width.value * pixelRatio.value;
    canvasRef.value.height = height.value * pixelRatio.value;
    const context = canvasRef.value.getContext("2d");
    context.scale(pixelRatio.value, pixelRatio.value);
    ctx.value = context;
  }
});

// Input Handlers
function handlePointerDown(e) {
  if (!props.isDrawer) return;
  e.target.setPointerCapture(e.pointerId);
  isDrawing.value = true;

  const point = [e.offsetX, e.offsetY, e.pressure];
  currentPoints.value = [point];

  sendAction(APP_ID, "stroke-start", point);
}

function handlePointerMove(e) {
  if (!isDrawing.value) return;

  // Coalesced events for smoother lines typically, but keeping simple here
  const point = [e.offsetX, e.offsetY, e.pressure];
  currentPoints.value = [...currentPoints.value, point]; // shallow replace

  sendAction(APP_ID, "stroke-move", point);
}

function handlePointerUp(e) {
  if (!isDrawing.value) return;
  isDrawing.value = false;

  // Persist current stroke to local history (visual only for this demo)
  otherStrokes.value = [
    ...otherStrokes.value,
    { points: currentPoints.value, color: "#333" },
  ];
  currentPoints.value = [];

  sendAction(APP_ID, "stroke-end", {});
}

// Lifecycle
onMounted(() => {
  if (canvasRef.value) {
    canvasRef.value.width = canvasRef.value.clientWidth * pixelRatio.value;
    canvasRef.value.height = canvasRef.value.clientHeight * pixelRatio.value;
    const context = canvasRef.value.getContext("2d");
    context.scale(pixelRatio.value, pixelRatio.value);
    ctx.value = context;
  }

  render();

  // Remote Events (Simplified)
  // In real app: need to track remote user IDs and their current strokes separately
  onAction(APP_ID, "stroke-move", (payload) => {
    // Mock implementation: receiving points would update a specific remote stroke map
  });
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
});
</script>
