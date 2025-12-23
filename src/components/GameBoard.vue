<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useSocket } from "../composables/useSocket";
import { useGameStore } from "../store/game";
import { storeToRefs } from "pinia";
import { useResizeObserver } from "@vueuse/core";

// Props 定义
const props = defineProps({
  // 是否是当前画手 (控制权限)
  isDrawer: {
    type: Boolean,
    default: false
  },
  // 画笔颜色
  strokeColor: {
    type: String,
    default: "#000000"
  },
  // 画笔粗细 (1-20)
  strokeWidth: {
    type: Number,
    default: 5
  },
  // 是否禁用画板 (如非游戏时间)
  disabled: {
    type: Boolean,
    default: false
  }
});

// 逻辑坐标系基准 (服务端和逻辑层统一使用此分辨率)
const LOGICAL_SIZE = 2000;

const canvasRef = ref(null);
const containerRef = ref(null);
const { getSocket } = useSocket();
const socket = getSocket();

// 绘图状态
let ctx = null;
let isDrawing = false;
let lastPoint = { x: 0, y: 0 };

// 外部状态
const { currentDrawerId } = storeToRefs(useGameStore());

// ====== 坐标转换核心 (Normalize / Denormalize) ======

/**
 * 将屏幕实际像素坐标 -> 归一化逻辑坐标 (0~2000)
 */
function toLogical(screenX, screenY) {
  if (!canvasRef.value) return { x: 0, y: 0 };
  const rect = canvasRef.value.getBoundingClientRect();

  // 计算相对于 Canvas 左上角的偏移
  const relativeX = screenX - rect.left;
  const relativeY = screenY - rect.top;

  // 映射到 2000x2000
  // 注意：需要按当前 Canvas 显示的宽高比进行缩放
  // 我们假定 Canvas 总是铺满容器，所以用 clientWidth/HTml
  const scaleX = LOGICAL_SIZE / canvasRef.value.clientWidth;
  const scaleY = LOGICAL_SIZE / canvasRef.value.clientHeight;

  return {
    x: Math.round(relativeX * scaleX),
    y: Math.round(relativeY * scaleY)
  };
}

/**
 * 将归一化逻辑坐标 -> 屏幕实际绘制坐标
 */
function toScreen(logicalX, logicalY) {
  if (!canvasRef.value) return { x: 0, y: 0 };

  const scaleX = canvasRef.value.clientWidth / LOGICAL_SIZE;
  const scaleY = canvasRef.value.clientHeight / LOGICAL_SIZE;

  return {
    x: logicalX * scaleX,
    y: logicalY * scaleY
  };
}

// ====== 绘图逻辑 ======

function initCanvas() {
  const canvas = canvasRef.value;
  const container = containerRef.value;

  if (!canvas || !container) return;

  // 设置 Canvas 内部分辨率与显示大小一致 (物理像素)
  // 为了 Retina 屏清晰度，其实可以 x2，但这里先 1:1 保证性能
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;

  ctx = canvas.getContext("2d", { alpha: false }); // 优化：关闭透明通道

  // 填充白色背景
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 设置线条样式
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

// 本地落笔 (仅画手触发)
function startDrawing(e) {
  if (!props.isDrawer || props.disabled) return;
  isDrawing = true;

  // 兼容 Touch 和 Mouse
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const point = toLogical(clientX, clientY);
  lastPoint = point;

  // 发送开始事件 (可选，如果只需画线可忽略，但为了断笔重连建议发)
  socket?.emit("draw_start", { x: point.x, y: point.y, color: props.strokeColor, width: props.strokeWidth });
}

// 本地移动 (仅画手触发)
function draw(e) {
  if (!isDrawing || !props.isDrawer || props.disabled) return;
  e.preventDefault(); // 只有在画画时才阻止默认滚动

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const currentPoint = toLogical(clientX, clientY);

  // 1. 本地立即绘制 (使用逻辑坐标转屏幕坐标)
  drawLineLocally(lastPoint, currentPoint, props.strokeColor, props.strokeWidth);

  // 2. 发送数据 (发送逻辑坐标)
  socket?.emit("draw", {
    from: lastPoint,
    to: currentPoint,
    color: props.strokeColor,
    width: props.strokeWidth
  });

  lastPoint = currentPoint;
}

// 本地抬笔
function stopDrawing() {
  if (!isDrawing) return;
  isDrawing = false;
  socket?.emit("draw_end");
}

// 核心绘制函数 (通用)
function drawLineLocally(startLogical, endLogical, color, width) {
  if (!ctx) return;

  const start = toScreen(startLogical.x, startLogical.y);
  const end = toScreen(endLogical.x, endLogical.y);

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width * (canvasRef.value.clientWidth / LOGICAL_SIZE) * 2; // 粗细也要按比例缩放! *2是修正系数

  ctx.moveTo(start.x, start.y);
  // 使用贝塞尔曲线？因为这里是基于高频点，直线连接(LineTo)其实足够平滑且性能最好
  // 如果点很稀疏再用 Quadratic
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.closePath();
}

// 清空画布
function clearCanvas(emit = true) {
  if (!ctx || !canvasRef.value) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);

  if (emit && props.isDrawer) {
    socket?.emit("clear_canvas");
  }
}

// ====== 响应 Socket 事件 (观众端) ======

function handleRemoteDraw(data) {
  //data: { from: {x,y}, to: {x,y}, color, width }
  if (data) {
    drawLineLocally(data.from, data.to, data.color, data.width);
  }
}

/**
 * 重放历史轨迹 (用于断线重连或进房同步)
 * @param {Array} history
 */
function replayHistory(history) {
  if (!Array.isArray(history)) return;

  // 批量绘制，建议用 requestAnimationFrame 分批或者直接同步(如果量不大)
  // 这里直接同步绘制
  history.forEach(item => {
    if (item.type === "draw") {
      handleRemoteDraw(item.data);
    } else if (item.type === "clear_canvas") {
      clearCanvas(false);
    }
  });
}

// ====== Resize 适配 ======
function handleResize() {
  if (!ctx || !canvasRef.value) return;

  // 1. 保存当前画面
  const imageData = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height);

  // 2. 重置 Canvas 大小
  initCanvas();

  // 3. 恢复画面 (注意: 只是简单恢复像素，如果宽窄变更大可能会有留白或裁剪)
  // 如果追求完美，应该存逻辑路径并重绘。但也就是为了应付旋转屏幕。
  ctx.putImageData(imageData, 0, 0);
}

// 暴露给父组件调用
defineExpose({
  clearCanvas,
  replayHistory
});

onMounted(() => {
  initCanvas();
  // 使用 VueUse 监听容器尺寸变化 (更精准，不仅限窗口)
  useResizeObserver(containerRef, entries => {
    handleResize();
  });

  // 监听远程绘画
  if (socket) {
    socket.on("draw", handleRemoteDraw);
    socket.on("clear_canvas", () => clearCanvas(false));
  }
});

onUnmounted(() => {
  // VueUse 的 observer 会自动清理，但 Socket 事件要手动清理
  if (socket) {
    socket.off("draw", handleRemoteDraw);
    socket.off("clear_canvas");
  }
});
</script>

<template>
  <div ref="containerRef" class="relative w-full h-full bg-white shadow-inner overflow-hidden select-none touch-none">
    <canvas
      ref="canvasRef"
      class="block cursor-crosshair"
      :style="{ touchAction: 'none' }"
      @mousedown="startDrawing"
      @mousemove="draw"
      @mouseup="stopDrawing"
      @mouseleave="stopDrawing"
      @touchstart.passive="startDrawing"
      @touchmove.prevent="draw"
      @touchend="stopDrawing"
    ></canvas>
  </div>
</template>

<style scoped>
/* 确保 Canvas 容器在父级中能够正确撑开 */
</style>
