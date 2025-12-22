import { defineStore } from "pinia";
import { ref } from "vue";

export const useGameStore = defineStore("game", () => {
  // 核心游戏状态
  const players = ref([]); // 玩家列表: [{ id, name, score, avatar ... }]
  const currentDrawerId = ref(null); // 当前画手的 Socket ID
  const currentWord = ref(""); // 当前题目 (仅画手可见，或猜中后显示)
  const scores = ref({}); // 积分表: { [playerId]: score }

  // 辅助状态
  const isGameStarted = ref(false);
  const round = ref(0);

  /**
   * 统一处理服务端推送的全量/增量状态更新
   * @param {Object} payload 包含需要更新的状态字段
   */
  function updateState(payload) {
    if (!payload) return;

    if (Array.isArray(payload.players)) {
      players.value = payload.players;
    }

    if (payload.currentDrawerId !== undefined) {
      currentDrawerId.value = payload.currentDrawerId;
    }

    if (payload.currentWord !== undefined) {
      currentWord.value = payload.currentWord;
    }

    if (payload.scores) {
      scores.value = payload.scores;
    }

    // 处理其他可能的扩展字段
    if (payload.isGameStarted !== undefined) isGameStarted.value = payload.isGameStarted;
    if (payload.round !== undefined) round.value = payload.round;
  }

  // 重置游戏状态
  function resetGame() {
    players.value = [];
    currentDrawerId.value = null;
    currentWord.value = "";
    scores.value = {};
    isGameStarted.value = false;
    round.value = 0;
  }

  return {
    players,
    currentDrawerId,
    currentWord,
    scores,
    isGameStarted,
    round,
    updateState,
    resetGame
  };
});
