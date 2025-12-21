import { computed, watch } from 'vue'
import { useThrottleFn } from '@vueuse/core'
import { useGameBridge } from '@/core/useGameBridge'
import { useDrawingStore } from '@/stores/drawing'
import { useGameStore } from '@/stores/game'

export function useSync() {
  const { sendAction, onAction, socket } = useGameBridge() // Access socket to get ID
  const store = useDrawingStore()
  const gameStore = useGameStore()
  const APP_ID = 'draw-guess'

  // --- Outgoing Events (Sender) ---

  function broadcastStart(line) {
    sendAction(APP_ID, 'draw-start', line)
  }

  // Throttle to ~33ms (30fps) to prevent network congestion/lag
  const broadcastMove = useThrottleFn((lineId, point) => {
    sendAction(APP_ID, 'draw-move', { id: lineId, point })
  }, 32)


  function broadcastEnd(lineId) {
    sendAction(APP_ID, 'draw-end', { id: lineId })
  }
  
  function sendGameStart() {
      sendAction(APP_ID, 'game-start', {})
  }
  
  function sendSelectWord(word) {
      sendAction(APP_ID, 'select-word', { word })
  }
  
  function sendGuess(text) {
      sendAction(APP_ID, 'guess', { text })
  }
  
  // --- Incoming Events (Receiver) ---
  
  function initListeners() {
    // Watch for socket connection / ID availability
    if (socket.value && socket.value.id) {
        gameStore.setMyId(socket.value.id)
    }
    
    // In case we are not connected yet, or ID changes (reconnect)
    watch(() => socket.value?.id, (newId) => {
        if (newId) {
            console.log('My Player ID:', newId)
            gameStore.setMyId(newId)
        }
    }, { immediate: true })
    
    // Core Game State
    onAction(APP_ID, 'game-state-update', (state) => {
        gameStore.updateState(state)
    })
    
    onAction(APP_ID, 'timer-update', (time) => {
        gameStore.setTime(time)
    })
    
    onAction(APP_ID, 'secret-word', (word) => {
        gameStore.setSecretWord(word)
    })
    
    // Drawing Sync
    onAction(APP_ID, 'draw-start', (line) => {
      store.addLine(line)
    })
    
    onAction(APP_ID, 'draw-move', ({ id, point }) => {
      store.appendPoint(id, point)
    })
    
    onAction(APP_ID, 'draw-end', ({ id }) => {
       // Optional: finalize line logic
    })
    
    // Board Control
    onAction(APP_ID, 'clear-board', () => {
        store.clearAll()
    })
    
    onAction(APP_ID, 'sync-state', (lines) => {
      store.setRemoteLines(lines)
    })

    // Feedback
    onAction(APP_ID, 'round-result', ({ reason, word }) => {
        // Could enable a toast or modal here
        console.log(`Round End: ${reason}. Word was: ${word}`)
    })
  }

  return {
    broadcastStart,
    broadcastMove,
    broadcastEnd,
    sendGameStart,
    sendSelectWord,
    sendGuess,
    initListeners
  }
}
