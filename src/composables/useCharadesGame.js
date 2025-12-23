import { ref, computed, onUnmounted } from "vue";

// Predefined Categories
const CATEGORIES = [
  {
    id: "daily",
    title: "🧸 生活用品",
    icon: "shopping",
    color: "#4ade80",
    words: [
      "冰箱",
      "拖鞋",
      "牙刷",
      "吹风机",
      "洗衣机",
      "电视机",
      "马桶",
      "垃圾桶",
      "眼镜",
      "口罩",
      "书包",
      "雨伞",
      "手机",
      "钥匙",
      "遥控器",
      "枕头"
    ]
  },
  {
    id: "animals",
    title: "🦁 疯狂动物",
    icon: "cat",
    color: "#facc15",
    words: ["大象", "长颈鹿", "猴子", "兔子", "老虎", "狮子", "企鹅", "袋鼠", "熊猫", "恐龙", "猪", "公鸡", "青蛙", "乌龟", "金鱼", "蚊子"]
  },
  {
    id: "actions",
    title: "🏃‍♂️ 动作模仿",
    icon: "run",
    color: "#f87171",
    words: [
      "刷牙",
      "洗澡",
      "睡觉",
      "打篮球",
      "游泳",
      "钓鱼",
      "跳舞",
      "奥特曼",
      "骑自行车",
      "放风筝",
      "打喷嚏",
      "举重",
      "自拍",
      "化妆",
      "开飞机",
      "炒菜"
    ]
  },
  {
    id: "foods",
    title: "🍔 美食大餐",
    icon: "food",
    color: "#fb923c",
    words: [
      "汉堡包",
      "冰淇淋",
      "面条",
      "火锅",
      "西瓜",
      "香蕉",
      "辣椒",
      "柠檬",
      "臭豆腐",
      "可乐",
      "奶茶",
      "饺子",
      "包子",
      "棒棒糖",
      "榴莲",
      "咖啡"
    ]
  }
];

export function useCharadesGame() {
  // === State ===
  const status = ref("setup"); // 'setup' | 'ready' (3s countdown) | 'playing' | 'finished'
  const selectedCategory = ref(CATEGORIES[0]);
  const gameDuration = ref(60); // seconds
  const timeLeft = ref(60);

  // Game Session Data
  const currentWord = ref("");
  const score = ref(0);
  const resultHistory = ref([]); // Array of { word: string, status: 'correct' | 'pass' }
  const wordQueue = ref([]);

  let timerInterval = null;

  // === Actions ===

  function setCategory(category) {
    selectedCategory.value = category;
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function startGame() {
    // 1. Prepare Data
    wordQueue.value = shuffle(selectedCategory.value.words);
    resultHistory.value = [];
    score.value = 0;
    timeLeft.value = gameDuration.value;

    // 2. Start Countdown Phase
    status.value = "ready";
    // Actual game start is triggered by the UI after countdown animation
  }

  function startRoundLogic() {
    status.value = "playing";
    pickNextWord();

    // Start Timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft.value--;
      if (timeLeft.value <= 0) {
        endGame();
      }
    }, 1000);
  }

  function pickNextWord() {
    if (wordQueue.value.length === 0) {
      // Recycle words if run out (unlikely but safe)
      wordQueue.value = shuffle(selectedCategory.value.words);
    }
    currentWord.value = wordQueue.value.pop();
  }

  function handleResult(result) {
    // result: 'correct' | 'pass'
    if (status.value !== "playing") return;

    if (result === "correct") {
      score.value++;
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      // Pass vibration
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    }

    resultHistory.value.push({
      word: currentWord.value,
      status: result
    });

    pickNextWord();
  }

  function endGame() {
    status.value = "finished";
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    // Release Wake Lock (handled in component usually, but good to close loops)
  }

  function resetGame() {
    status.value = "setup";
    currentWord.value = "";
    score.value = 0;
    resultHistory.value = [];
    if (timerInterval) clearInterval(timerInterval);
  }

  // Cleanup
  onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  return {
    // State
    status,
    selectedCategory,
    gameDuration,
    timeLeft,
    currentWord,
    score,
    resultHistory,
    CATEGORIES,

    // Getters
    gameProgress: computed(() => ((gameDuration.value - timeLeft.value) / gameDuration.value) * 100),

    // Actions
    setCategory,
    startGame,
    startRoundLogic,
    handleResult,
    endGame,
    resetGame
  };
}
