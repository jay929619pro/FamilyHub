import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGameStore = defineStore('game', () => {
  // synced with server
  const phase = ref('LOBBY') // LOBBY, SELECTING, DRAWING, ROUND_END, GAME_END
  const timeLeft = ref(0)
  const round = ref(1)
  const totalRounds = ref(3)
  const players = ref([]) // [{ id, name, score }]
  const drawerId = ref(null)
  
  // Local state
  const myPlayerId = ref(null)
  const mySecretWord = ref(null) // Only if drawer
  const wordsToSelect = ref([]) // Only if selecting
  const winner = ref(null)

  const isDrawer = computed(() => myPlayerId.value && myPlayerId.value === drawerId.value)

  function updateState(payload) {
    phase.value = payload.phase
    timeLeft.value = payload.timeLeft
    round.value = payload.round
    totalRounds.value = payload.totalRounds
    players.value = payload.users
    drawerId.value = payload.drawerId
    wordsToSelect.value = payload.wordsToSelect || []
    
    // Reset secret if not relevant
    if (phase.value !== 'DRAWING' && phase.value !== 'SELECTING') {
        mySecretWord.value = null
    }
  }

  function setTime(time) {
    timeLeft.value = time
  }

  function setMyId(id) {
    myPlayerId.value = id
  }
  
  function setProfile(name, avatar) {
      // Optimistic update
      const myPlayer = players.value.find(p => p.id === myPlayerId.value)
      if (myPlayer) {
          myPlayer.name = name
          myPlayer.avatar = avatar
      }
  }

  function setSecretWord(word) {
      mySecretWord.value = word
  }

  return {
    phase,
    timeLeft,
    round,
    totalRounds,
    players,
    drawerId,
    myPlayerId,
    mySecretWord,
    wordsToSelect,
    isDrawer,
    updateState,
    setTime,
    setMyId,
    setSecretWord,
    setProfile
  }
})
