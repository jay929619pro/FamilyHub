import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDrawingStore = defineStore('drawing', () => {
  // Scene Graph: List of line objects
  // { id: string, points: [x1, y1, x2, y2, ...], color: string, strokeWidth: number, tool: 'pen'|'eraser' }
  const lines = ref([])
  const isDrawing = ref(false)
  const currentLineId = ref(null)

  // Configuration
  const currentColor = ref('#000000')
  const currentWidth = ref(5)

  function startLine(point) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    currentLineId.value = id
    isDrawing.value = true
    
    // Return config for the component to use (native drawing)
    return {
      id,
      points: [point.x, point.y],
      color: currentColor.value,
      strokeWidth: currentWidth.value,
      tool: 'pen',
      tension: 0.5,
      lineCap: 'round',
      lineJoin: 'round'
    }
  }

  // Only used for remote updates or undo/redo
  function addLine(line) {
      lines.value.push(line)
  }

  function appendPoint(id, point) {
    // Only update if it's in the lines array (msg from remote)
    const line = lines.value.find(l => l.id === id)
    if (line) {
      line.points.push(point.x, point.y)
    }
  }

  function endLine() {
    isDrawing.value = false
    currentLineId.value = null
  }

  function clearAll() {
    lines.value = []
  }

  function setRemoteLines(remoteLines) {
    lines.value = remoteLines || []
  }
  
  function updateLine(lineId, newPoints) {
      const line = lines.value.find(l => l.id === lineId)
      if (line) {
          line.points = newPoints
      }
  }

  return {
    lines,
    isDrawing,
    currentLineId,
    currentColor,
    currentWidth,
    startLine,
    addLine,
    appendPoint,
    endLine,
    clearAll,
    setRemoteLines,
    updateLine
  }
})
