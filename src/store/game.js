import { defineStore } from "pinia";
import { ref } from "vue";

export const useGameStore = defineStore("game", () => {
  // 核心游戏状态
  const players = ref([]); // 玩家列表: [{ id, name, score, avatar ... }]
  const currentDrawerId = ref(null); // 当前画手的 Socket ID
  const currentWord = ref(""); // 当前题目 (仅画手可见，或猜中后显示)
  const scores = ref({}); // 积分表: { [playerName]: score }

  // 游戏循环状态
  const status = ref("waiting"); // 'waiting' | 'playing' | 'result'
  const round = ref(0);
  const timeLeft = ref(0);
  const roundWinnerId = ref(null); // 本轮获胜者ID
  const nextDrawerId = ref(null); // 下一位画手ID

  // 辅助状态
  const isGameStarted = ref(false); // Deprecated, use status instead

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
    if (payload.roundWinnerId !== undefined) roundWinnerId.value = payload.roundWinnerId;
    if (payload.nextDrawerId !== undefined) nextDrawerId.value = payload.nextDrawerId;
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
  }

  return {
    players,
    currentDrawerId,
    currentWord,
    scores,
    status,
    round,
    timeLeft,
    roundWinnerId,
    nextDrawerId,

    updateState,
    updateTimer,
    resetGame
  };
});
