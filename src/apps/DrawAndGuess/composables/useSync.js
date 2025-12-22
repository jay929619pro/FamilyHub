import { computed, watch } from "vue";
import { useThrottleFn } from "@vueuse/core";
import { useGameBridge } from "@/core/useGameBridge";
import { useDrawingStore } from "@/stores/drawing";
import { useGameStore } from "@/stores/game";

export function useSync() {
  const { sendAction, onAction, socket, connected } = useGameBridge(); // Access socket to get ID
  const store = useDrawingStore();
  const gameStore = useGameStore();
  const APP_ID = "draw-guess";

  // --- Outgoing Events (Sender) ---

  function broadcastStart(line) {
    sendAction(APP_ID, "draw-start", line);
  }

  // Throttle to ~33ms (30fps) to prevent network congestion/lag
  const broadcastMove = useThrottleFn((lineId, point) => {
    sendAction(APP_ID, "draw-move", { id: lineId, point });
  }, 32);

  function broadcastEnd(lineId) {
    sendAction(APP_ID, "draw-end", { id: lineId });
  }

  function sendGameStart() {
    sendAction(APP_ID, "game-start", {});
  }

  function sendSelectWord(word) {
    sendAction(APP_ID, "select-word", { word });
  }

  function sendGuess(text) {
    sendAction(APP_ID, "guess", { text });
  }

  // --- Incoming Events (Receiver) ---

  function initListeners() {
    const unsubs = [];

    // Set My ID from Persistent Storage
    const userId = localStorage.getItem("family-hub-user-id");
    if (userId) {
      gameStore.setMyId(userId);
    }

    // Watch for connection to sync profile
    const unwatch = watch(
      () => connected.value,
      isConnected => {
        if (isConnected) {
          console.log("Connected using ID:", userId);

          // Restore Profile if exists
          const stored = localStorage.getItem("family-hub-profile");
          if (stored) {
            try {
              const { name, avatar } = JSON.parse(stored);
              if (name) {
                sendUpdateProfile(name, avatar);
                // Optimistic update
                gameStore.setProfile(name, avatar);
              }
            } catch (e) {}
          }
        }
      },
      { immediate: true }
    );
    unsubs.push(unwatch);

    // Core Game State
    unsubs.push(
      onAction(APP_ID, "game-state-update", state => {
        gameStore.updateState(state);
      })
    );

    unsubs.push(
      onAction(APP_ID, "timer-update", time => {
        gameStore.setTime(time);
      })
    );

    unsubs.push(
      onAction(APP_ID, "secret-word", word => {
        gameStore.setSecretWord(word);
      })
    );

    // Drawing Sync
    unsubs.push(
      onAction(APP_ID, "draw-start", line => {
        store.addLine(line);
      })
    );

    unsubs.push(
      onAction(APP_ID, "draw-move", ({ id, point }) => {
        store.appendPoint(id, point);
      })
    );

    unsubs.push(
      onAction(APP_ID, "draw-end", ({ id }) => {
        // Optional: finalize line logic
      })
    );

    // Board Control
    unsubs.push(
      onAction(APP_ID, "clear-board", () => {
        store.clearAll();
      })
    );

    unsubs.push(
      onAction(APP_ID, "sync-state", lines => {
        store.setRemoteLines(lines);
      })
    );

    // Feedback
    unsubs.push(
      onAction(APP_ID, "round-result", ({ reason, word }) => {
        // Could enable a toast or modal here
        console.log(`Round End: ${reason}. Word was: ${word}`);
      })
    );

    return () => unsubs.forEach(fn => fn());
  }

  function sendUpdateProfile(name, avatar) {
    sendAction(APP_ID, "update-profile", { name, avatar });
  }

  return {
    broadcastStart,
    broadcastMove,
    broadcastEnd,
    sendGameStart,
    sendSelectWord,
    sendGuess,
    sendUpdateProfile,
    initListeners,
    onAction,
    connected // Export connected state
  };
}
