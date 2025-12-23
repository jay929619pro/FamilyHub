import { ref, computed, onUnmounted } from "vue";

// Predefined Categories
// Word Lists
const dailyWords = [
  "冰箱", "拖鞋", "牙刷", "吹风机", "洗衣机", "电视机", "马桶", "垃圾桶", "眼镜", "口罩", "书包", "雨伞", "手机", "钥匙", "遥控器", "枕头",
  "杯子", "筷子", "梳子", "镜子", "剪刀", "指甲刀", "沐浴露", "洗发水", "卫生纸", "充电器", "笔记本", "笔", "橡皮", "尺子", "胶带", "订书机", "鼠标", "键盘", "耳机", "台灯",
  "沙发", "窗帘", "地毯", "围裙", "手表", "戒指", "项链", "耳环", "钱包", "背包", "行李箱", "雨衣", "太阳镜", "创可贴", "体温计", "药箱", "花瓶", "盆栽", "暖水瓶", "电风扇", "空调", "暖气片", "路由器", "遥控车", "积木", "拼图", "蜡笔", "水彩笔", "卷笔刀", "修正带", "计算器", "地球仪", "保温杯", "饭盒", "围巾", "手套", "袜子", "皮带", "相机", "三脚架", "麦克风", "音响", "投影仪",
  "微波炉", "烤箱", "电饭煲", "洗碗机", "扫地机器人", "空气炸锅", "加湿器", "吸尘器", "豆浆机", "破壁机", "电磁炉", "高压锅", "电水壶", "燃气灶", "油烟机", "消毒柜", "饮水机", "跑步机", "按摩椅", "体重秤", "卷发棒", "剃须刀", "美容仪", "电动牙刷", "冲牙器", "洗脸巾", "面膜", "防晒霜", "口红", "香水", "粉底液", "眉笔", "眼影", "腮红", "指甲油", "卸妆水", "护手霜", "身体乳", "洗手液", "洗衣液", "柔顺剂", "洁厕灵", "垃圾袋", "保鲜膜", "锡纸", "抹布", "钢丝球", "拖把", "扫把", "簸箕", "晾衣架", "衣柜", "鞋柜", "床头柜", "餐桌", "书柜", "茶几", "电视柜"
];

const animalWords = [
  "大象", "长颈鹿", "猴子", "兔子", "老虎", "狮子", "企鹅", "袋鼠", "熊猫", "恐龙", "猪", "公鸡", "青蛙", "乌龟", "金鱼", "蚊子",
  "考拉", "树懒", "海豚", "鲨鱼", "鲸鱼", "章鱼", "螃蟹", "龙虾", "蝴蝶", "蜜蜂", "蜘蛛", "蚂蚁", "蜗牛", "刺猬", "松鼠", "骆驼", "斑马", "犀牛", "河马", "鳄鱼",
  "北极熊", "狐狸", "狼", "豹子", "浣熊", "水獭", "海豹", "海狮", "海象", "鹦鹉", "乌鸦", "老鹰", "猫头鹰", "啄木鸟", "鸵鸟", "孔雀", "天鹅", "鸭子", "鹅", "鸽子", "蝙蝠", "老鼠", "苍蝇", "蟑螂", "蜈蚣", "蝎子", "变色龙", "壁虎", "蛇", "蜥蜴", "娃娃鱼", "海马", "水母", "海星", "珊瑚", "贝壳", "萤火虫", "瓢虫", "蜻蜓",
  "穿山甲", "食蚁兽", "土拨鼠", "水豚", "羊驼", "黑猩猩", "金丝猴", "长臂猿", "狒狒", "山魈", "美洲豹", "美洲狮", "猞猁", "鬣狗", "野猪", "豪猪", "麋鹿", "驯鹿", "梅花鹿", "羚羊", "牦牛", "野牛", "骆驼", "草泥马", "藏獒", "哈士奇", "金毛", "泰迪", "比格犬", "柴犬", "柯基", "边牧", "德牧", "波斯猫", "布偶猫", "暹罗猫", "加菲猫", "折耳猫", "仓鼠", "龙猫", "荷兰猪", "刺猬", "乌骨鸡", "火鸡", "信鸽", "喜鹊", "麻雀", "燕子", "大雁", "白鹭", "丹顶鹤", "火烈鸟", "海鸥", "信天翁", "百灵鸟", "画眉鸟", "八哥"
];

const actionWords = [
  "刷牙", "洗澡", "睡觉", "打篮球", "游泳", "钓鱼", "跳舞", "奥特曼", "骑自行车", "放风筝", "打喷嚏", "举重", "自拍", "化妆", "开飞机", "炒菜",
  "扫地", "拖地", "擦窗户", "扔垃圾", "遛狗", "喂猫", "浇花", "剪指甲", "掏耳朵", "按摩", "伸懒腰", "打哈欠", "咳嗽", "喝汤", "啃玉米", "剥香蕉", "削苹果", "切菜", "揉面", "擀饺子皮",
  "跑步", "竞走", "跨栏", "投篮", "踢足球", "守门", "打排球", "打乒乓球", "打羽毛球", "打网球", "打高尔夫", "打台球", "射箭", "射击", "击剑", "拳击", "摔跤", "柔道", "跆拳道", "滑雪", "滑冰", "冲浪", "潜水", "拔河", "吹气球", "吹蜡烛", "切蛋糕", "喝水", "漱口", "洗脸", "梳头", "扎辫子", "戴眼镜", "戴帽子", "系鞋带", "穿衣服", "叠被子", "晾衣服", "熨衣服", "缝衣服", "织毛衣", "弹钢琴", "拉小提琴", "吹笛子",
  "弹吉他", "打鼓", "吹萨克斯", "拉手风琴", "指挥", "唱歌", "跳芭蕾", "跳街舞", "跳拉丁舞", "打太极", "练瑜伽", "做俯卧撑", "仰卧起坐", "引体向上", "跳远", "跳高", "扔铅球", "扔标枪", "骑马", "赛车", "攀岩", "蹦极", "跳伞", "滑板", "轮滑", "溜冰", "玩滑梯", "荡秋千", "跷跷板", "捉迷藏", "丢手绢", "老鹰捉小鸡", "跳房子", "踢毽子", "滚铁环", "抽陀螺", "放鞭炮", "堆雪人", "打雪仗", "野餐", "露营", "烧烤", "看电影", "看书", "写字", "画画", "玩手机", "打游戏", "拍照", "录视频", "做直播"
];

const foodWords = [
  "汉堡包", "冰淇淋", "面条", "火锅", "西瓜", "香蕉", "辣椒", "柠檬", "臭豆腐", "可乐", "奶茶", "饺子", "包子", "棒棒糖", "榴莲", "咖啡",
  "披萨", "薯条", "炸鸡", "烤鸭", "寿司", "生鱼片", "意大利面", "牛排", "沙拉", "蛋糕", "甜甜圈", "饼干", "巧克力", "糖果", "薯片", "爆米花", "酸奶", "牛奶", "果汁", "啤酒",
  "烤肉", "烤鱼", "烤红薯", "烤玉米", "茶叶蛋", "荷包蛋", "炒饭", "炒面", "凉皮", "肉夹馍", "羊肉串", "糖葫芦", "麻婆豆腐", "宫保鸡丁", "鱼香肉丝", "水煮鱼", "酸菜鱼", "红烧肉", "糖醋排骨", "粉蒸肉", "扣肉", "狮子头", "佛跳墙", "燕窝", "鱼翅", "鲍鱼", "海参", "小龙虾", "大闸蟹", "生蚝", "扇贝", "鱿鱼", "章鱼小丸子", "关东煮", "蛋挞", "泡芙", "提拉米苏", "布丁",
  "双皮奶", "烧仙草", "杨枝甘露", "西米露", "姜撞奶", "龟苓膏", "绿豆汤", "红豆沙", "汤圆", "元宵", "粽子", "月饼", "青团", "春卷", "锅贴", "生煎包", "小笼包", "叉烧包", "流沙包", "虾饺", "烧卖", "肠粉", "云吞", "馄饨", "热干面", "炸酱面", "刀削面", "拉面", "米粉", "螺蛳粉", "酸辣粉", "过桥米线", "砂锅粥", "皮蛋瘦肉粥", "八宝粥", "油条", "豆浆", "豆腐脑", "煎饼果子", "鸡蛋灌饼", "手抓饼", "烤冷面", "老婆饼", "凤梨酥", "牛轧糖", "大白兔", "辣条", "方便面", "火腿肠", "卤蛋"
];

// New Categories
const professionWords = [
  "老师", "医生", "护士", "警察", "消防员", "厨师", "司机", "飞行员", "宇航员", "画家", "歌手", "演员", "魔术师", "小丑", "科学家", "农民", "理发师", "快递员", "外卖员", "清洁工", "保安", "收银员", "服务员", "导游", "记者", "摄影师", "程序员", "老板", "秘书", "律师", "法官", "运动员", "教练", "裁判", "主持人", "网络主播", "侦探", "园丁", "木匠", "裁缝",
  "电工", "水管工", "油漆工", "瓦工", "搬运工", "矿工", "渔夫", "猎人", "兽医", "驯兽师", "宇航员", "天文学家", "考古学家", "探险家", "发明家", "作家", "编剧", "导演", "制片人", "模特", "设计师", "建筑师", "工程师", "会计", "出纳", "银行柜员", "保险业务员", "房产中介", "销售员", "客服", "前台", "行政", "人事", "猎头", "翻译", "外交官", "总统", "市长", "村长", "校长", "幼儿园老师", "健身教练", "瑜伽教练", "舞蹈老师", "音乐老师", "美术老师"
];

const cartoonWords = [
  "喜羊羊", "灰太狼", "熊大", "光头强", "小猪佩奇", "奥特曼", "蜘蛛侠", "艾莎公主", "孙悟空", "猪八戒", "哪吒", "葫芦娃", "黑猫警长", "哆啦A梦", "皮卡丘", "唐老鸭", "米老鼠", "白雪公主", "哈利波特", "美国队长", "钢铁侠", "海绵宝宝", "派大星", "柯南", "蜡笔小新", "樱桃小丸子", "路飞", "鸣人", "汤姆和杰瑞", "千寻", "龙猫", "大白", "功夫熊猫", "小黄人", "变形金刚", "巴斯光年",
  "大头儿子", "小头爸爸", "舒克", "贝塔", "阿童木", "一休哥", "大力水手", "蓝精灵", "加菲猫", "史努比", "维尼熊", "跳跳虎", "辛普森", "忍者神龟", "绿巨人", "雷神", "黑寡妇", "鹰眼", "死侍", "金刚狼", "蝙蝠侠", "超人", "神奇女侠", "闪电侠", "水行侠", "灭霸", "毒液", "格鲁", "尼莫", "多莉", "麦昆", "胡迪", "翠丝", "艾瑞克", "美人鱼", "灰姑娘", "睡美人", "贝儿公主", "茉莉公主", "木兰", "艾丽斯", "匹诺曹", "小飞象", "小鹿斑比"
];

const idiomWords = [
  "对牛弹琴", "画蛇添足", "掩耳盗铃", "守株待兔", "亡羊补牢", "刻舟求剑", "井底之蛙", "盲人摸象", "狐假虎威", "闻鸡起舞", "指鹿为马", "一石二鸟", "三头六臂", "七上八下", "五花八门", "九牛一毛", "顺手牵羊", "打草惊蛇", "调虎离山", "一鸣惊人", "自相矛盾", "滥竽充数", "东施效颦", "邯郸学步", "悬梁刺股", "凿壁偷光", "负荆请罪", "三顾茅庐", "草船借箭", "空城计",
  "叶公好龙", "拔苗助长", "坐井观天", "得过且过", "望梅止渴", "杯弓蛇影", "如鱼得水", "如虎添翼", "鸡飞狗跳", "狼吞虎咽", "龙飞凤舞", "马到成功", "牛气冲天", "心花怒放", "手舞足蹈", "眉开眼笑", "垂头丧气", "大惊小色", "目瞪口呆", "张牙舞爪", "生龙活虎", "呆若木鸡", "对答如流", "妙语连珠", "口若悬河", "滔滔不绝", "鸦雀无声", "欢天喜地", "喜出望外", "怒发冲冠", "暴跳如雷", "心急如焚", "忐忑不安", "心惊肉跳", "无论如何", "千方百计", "全心全意", "一心一意", "三心二意", "七嘴八舌", "成群结队"
];

// Predefined Categories
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
    id: "cartoons",
    title: "动画影视",
    emoji: "🦸",
    color: "#60a5fa",
    words: cartoonWords
  },
  {
    id: "mixed",
    title: "综合挑战",
    emoji: "🎉",
    color: "#a855f7",
    words: [...dailyWords, ...animalWords, ...actionWords, ...foodWords, ...cartoonWords]
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
