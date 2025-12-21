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
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, shallowRef } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { useDrawingStore } from '@/stores/drawing'
import { useSync } from '../composables/useSync'
import { pointsToPath } from '@/utils/drawing'

const props = defineProps(['isDrawer'])
const containerRef = ref(null)

// Store & Composables
const store = useDrawingStore()
const { broadcastStart, broadcastMove, broadcastEnd, initListeners } = useSync()
const { width, height } = useWindowSize()

// Stage Config
const stageConfig = ref({
  width: 500,
  height: 500
})

// Local State for Active Stroke
const currentPoints = shallowRef([]) // [x,y, x,y...]

const currentPathData = computed(() => {
    return pointsToPath(currentPoints.value, { 
        size: store.currentWidth,
        simulatePressure: false 
    })
})

const getPath = (line) => {
    return pointsToPath(line.points, { size: line.strokeWidth })
}

// Update stage size on window resize
watch([width, height], () => {
  if (containerRef.value) {
    stageConfig.value.width = containerRef.value.clientWidth
    stageConfig.value.height = containerRef.value.clientHeight
  }
})

onMounted(() => {
  if (containerRef.value) {
    stageConfig.value.width = containerRef.value.clientWidth
    stageConfig.value.height = containerRef.value.clientHeight
  }
  
  initListeners()
})

// --- Interaction Handlers ---

function getPointerPosition(e) {
  const stage = e.target.getStage()
  return stage.getPointerPosition()
}

function handleStart(e) {
  if (!props.isDrawer) return
  
  if(e.evt.type === 'touchstart') {
      e.evt.preventDefault() 
  }

  const pos = getPointerPosition(e)
  if (!pos) return

  // Start logic
  const newLineConfig = store.startLine(pos)
  currentPoints.value = [pos.x, pos.y]
  
  broadcastStart(newLineConfig)
}

function handleMove(e) {
  if (!store.isDrawing || !props.isDrawer) return
  
  if(e.evt.type === 'touchmove') {
      e.evt.preventDefault()
  }

  const pos = getPointerPosition(e)
  if (!pos) return

  // Update local visual immediately (Vue Reactive)
  // Creating a new array to trigger reactivity for shallowRef
  currentPoints.value = [...currentPoints.value, pos.x, pos.y]

  // Broadcast
  broadcastMove(store.currentLineId, pos) 
}

function handleEnd() {
  if (!store.isDrawing || !props.isDrawer) return
  
  // Commit to store
  const lineConfig = {
      id: store.currentLineId,
      points: currentPoints.value,
      color: store.currentColor,
      strokeWidth: store.currentWidth
  }
  store.addLine(lineConfig)
  
  const lineId = store.currentLineId
  store.endLine()
  currentPoints.value = [] // clear local
  
  broadcastEnd(lineId)
}
</script>
