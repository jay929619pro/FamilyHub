import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFamilyStore = defineStore('family', () => {
  const currentMember = ref(null) // { id, name, avatar }
  const roomState = ref({
    roomId: null,
    members: [],
    status: 'idle', // idle, playing
    currentApp: null // 'DrawAndGuess', etc.
  })

  function setMember(member) {
    currentMember.value = member
  }

  function updateRoom(state) {
    roomState.value = { ...roomState.value, ...state }
  }

  return {
    currentMember,
    roomState,
    setMember,
    updateRoom
  }
})
