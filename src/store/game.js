import { defineStore } from "pinia";
import { ref } from "vue";

export const useGameStore = defineStore("game", () => {
  // 核心游戏状态
  const players = ref([]); // 玩家列表: [{ id, name, score, avatar ... }]
  const currentDrawerId = ref(null); // 当前画手的 Socket ID
  const currentWord = ref(""); // 当前题目 (仅画手可见，或猜中后显示)
  const scores = ref({}); // 积分表: { [playerName]: score }

  // 生命周期状态
  const status = ref("waiting"); // 'waiting' | 'playing' | 'result'
  const timeLeft = ref(0);
  const round = ref(0);

  // 辅助状态
  const isGameStarted = ref(false); // Deprecated, use status instead
  const category = ref("kids"); // 'kids' | 'family' | 'pro'

  /**
   * 统一处理服务端推送的全量/增量状态更新
   * @param {Object} payload 包含需要更新的状态字段
   */
  function updateState(payload) {
    if (!payload) return;

    if (Array.isArray(payload.players)) players.value = payload.players;
    if (payload.currentDrawerId !== undefined) currentDrawerId.value = payload.currentDrawerId;
    if (payload.currentWord !== undefined) currentWord.value = payload.currentWord;
    if (payload.scores) scores.value = payload.scores;

    // Lifecycle updates
    if (payload.status) status.value = payload.status;
    if (payload.timeLeft !== undefined) timeLeft.value = payload.timeLeft;
    if (payload.round !== undefined) round.value = payload.round;

    // Category update
    if (payload.category) category.value = payload.category;
  }

  function updateTimer(seconds) {
    timeLeft.value = seconds;
  }

  // 重置游戏状态
  function resetGame() {
    players.value = [];
    currentDrawerId.value = null;
    currentWord.value = "";
    scores.value = {};
    status.value = "waiting";
    timeLeft.value = 0;
    round.value = 0;
    category.value = "kids";
  }

  return {
    players,
    currentDrawerId,
    currentWord,
    scores,
    status,
    timeLeft,
    round,
    updateState,
    updateTimer,
    resetGame,
    category
  };
});
