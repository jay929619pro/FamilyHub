import { ref, computed, onUnmounted } from "vue";

// Predefined Categories
// Word Lists
const dailyWords = [
  "冰箱", "拖鞋", "牙刷", "吹风机", "洗衣机", "电视机", "马桶", "垃圾桶", "眼镜", "口罩", "书包", "雨伞", "手机", "钥匙", "遥控器", "枕头",
  "杯子", "筷子", "梳子", "镜子", "剪刀", "指甲刀", "沐浴露", "洗发水", "卫生纸", "充电器", "笔记本", "笔", "橡皮", "尺子", "胶带", "订书机", "鼠标", "键盘", "耳机", "台灯",
  "沙发", "窗帘", "地毯", "围裙", "手表", "戒指", "项链", "耳环", "钱包", "背包", "行李箱", "雨衣", "太阳镜", "创可贴", "体温计", "药箱", "花瓶", "盆栽", "暖水瓶", "电风扇", "空调", "暖气片", "路由器", "遥控车", "积木", "拼图", "蜡笔", "水彩笔", "卷笔刀", "修正带", "计算器", "地球仪", "保温杯", "饭盒", "围巾", "手套", "袜子", "皮带", "相机", "三脚架", "麦克风", "音响", "投影仪"
];

const animalWords = [
  "大象", "长颈鹿", "猴子", "兔子", "老虎", "狮子", "企鹅", "袋鼠", "熊猫", "恐龙", "猪", "公鸡", "青蛙", "乌龟", "金鱼", "蚊子",
  "考拉", "树懒", "海豚", "鲨鱼", "鲸鱼", "章鱼", "螃蟹", "龙虾", "蝴蝶", "蜜蜂", "蜘蛛", "蚂蚁", "蜗牛", "刺猬", "松鼠", "骆驼", "斑马", "犀牛", "河马", "鳄鱼",
  "北极熊", "狐狸", "狼", "豹子", "浣熊", "水獭", "海豹", "海狮", "海象", "鹦鹉", "乌鸦", "老鹰", "猫头鹰", "啄木鸟", "鸵鸟", "孔雀", "天鹅", "鸭子", "鹅", "鸽子", "蝙蝠", "老鼠", "苍蝇", "蟑螂", "蜈蚣", "蝎子", "变色龙", "壁虎", "蛇", "蜥蜴", "娃娃鱼", "海马", "水母", "海星", "珊瑚", "贝壳", "萤火虫", "瓢虫", "蜻蜓"
];

const actionWords = [
  "刷牙", "洗澡", "睡觉", "打篮球", "游泳", "钓鱼", "跳舞", "奥特曼", "骑自行车", "放风筝", "打喷嚏", "举重", "自拍", "化妆", "开飞机", "炒菜",
  "扫地", "拖地", "擦窗户", "扔垃圾", "遛狗", "喂猫", "浇花", "剪指甲", "掏耳朵", "按摩", "伸懒腰", "打哈欠", "咳嗽", "喝汤", "啃玉米", "剥香蕉", "削苹果", "切菜", "揉面", "擀饺子皮",
  "跑步", "竞走", "跨栏", "投篮", "踢足球", "守门", "打排球", "打乒乓球", "打羽毛球", "打网球", "打高尔夫", "打台球", "射箭", "射击", "击剑", "拳击", "摔跤", "柔道", "跆拳道", "滑雪", "滑冰", "冲浪", "潜水", "拔河", "吹气球", "吹蜡烛", "切蛋糕", "喝水", "漱口", "洗脸", "梳头", "扎辫子", "戴眼镜", "戴帽子", "系鞋带", "穿衣服", "叠被子", "晾衣服", "熨衣服", "缝衣服", "织毛衣", "弹钢琴", "拉小提琴", "吹笛子"
];

const foodWords = [
  "汉堡包", "冰淇淋", "面条", "火锅", "西瓜", "香蕉", "辣椒", "柠檬", "臭豆腐", "可乐", "奶茶", "饺子", "包子", "棒棒糖", "榴莲", "咖啡",
  "披萨", "薯条", "炸鸡", "烤鸭", "寿司", "生鱼片", "意大利面", "牛排", "沙拉", "蛋糕", "甜甜圈", "饼干", "巧克力", "糖果", "薯片", "爆米花", "酸奶", "牛奶", "果汁", "啤酒",
  "烤肉", "烤鱼", "烤红薯", "烤玉米", "茶叶蛋", "荷包蛋", "炒饭", "炒面", "凉皮", "肉夹馍", "羊肉串", "糖葫芦", "麻婆豆腐", "宫保鸡丁", "鱼香肉丝", "水煮鱼", "酸菜鱼", "红烧肉", "糖醋排骨", "粉蒸肉", "扣肉", "狮子头", "佛跳墙", "燕窝", "鱼翅", "鲍鱼", "海参", "小龙虾", "大闸蟹", "生蚝", "扇贝", "鱿鱼", "章鱼小丸子", "关东煮", "蛋挞", "泡芙", "提拉米苏", "布丁"
];

// New Categories
const professionWords = [
  "老师", "医生", "护士", "警察", "消防员", "厨师", "司机", "飞行员", "宇航员", "画家", "歌手", "演员", "魔术师", "小丑", "科学家", "农民", "理发师", "快递员", "外卖员", "清洁工", "保安", "收银员", "服务员", "导游", "记者", "摄影师", "程序员", "老板", "秘书", "律师", "法官", "运动员", "教练", "裁判", "主持人", "网络主播", "侦探", "园丁", "木匠", "裁缝"
];

const cartoonWords = [
  "喜羊羊", "灰太狼", "熊大", "光头强", "小猪佩奇", "奥特曼", "蜘蛛侠", "艾莎公主", "孙悟空", "猪八戒", "哪吒", "葫芦娃", "黑猫警长", "哆啦A梦", "皮卡丘", "唐老鸭", "米老鼠", "白雪公主", "哈利波特", "美国队长", "钢铁侠", "海绵宝宝", "派大星", "柯南", "蜡笔小新", "樱桃小丸子", "路飞", "鸣人", "汤姆和杰瑞", "千寻", "龙猫", "大白", "功夫熊猫", "小黄人", "变形金刚", "巴斯光年"
];

const idiomWords = [
  "对牛弹琴", "画蛇添足", "掩耳盗铃", "守株待兔", "亡羊补牢", "刻舟求剑", "井底之蛙", "盲人摸象", "狐假虎威", "闻鸡起舞", "指鹿为马", "一石二鸟", "三头六臂", "七上八下", "五花八门", "九牛一毛", "顺手牵羊", "打草惊蛇", "调虎离山", "一鸣惊人", "自相矛盾", "滥竽充数", "东施效颦", "邯郸学步", "悬梁刺股", "凿壁偷光", "负荆请罪", "三顾茅庐", "草船借箭", "空城计"
];

// Predefined Categories
const CATEGORIES = [
  {
    id: "daily",
    title: "生活用品",
    emoji: "🧸",
    color: "#4ade80",
    words: dailyWords
  },
  {
    id: "animals",
    title: "疯狂动物",
    emoji: "🦁",
    color: "#facc15",
    words: animalWords
  },
  {
    id: "actions",
    title: "动作模仿",
    emoji: "🏃‍♂️",
    color: "#f87171",
    words: actionWords
  },
  {
    id: "foods",
    title: "美食大餐",
    emoji: "🍔",
    color: "#fb923c",
    words: foodWords
  },
  {
    id: "professions",
    title: "职业身份",
    emoji: "👩‍⚕️",
    color: "#2dd4bf",
    words: professionWords
  },
  {
    id: "cartoons",
    title: "动画影视",
    emoji: "🦸",
    color: "#60a5fa",
    words: cartoonWords
  },
  {
    id: "idioms",
    title: "成语俗语",
    emoji: "📜",
    color: "#a78bfa",
    words: idiomWords
  },
  {
    id: "mixed",
    title: "综合挑战",
    emoji: "🎉",
    color: "#a855f7",
    words: [...dailyWords, ...animalWords, ...actionWords, ...foodWords, ...professionWords, ...cartoonWords, ...idiomWords]
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
