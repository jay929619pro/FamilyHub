<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { Dialog, Snackbar } from "@varlet/ui";
import Phaser from "phaser";

const router = useRouter();

// === Vue State ===
const level = ref(1);
const questionText = ref("");
const levelData = ref(null);

// Items Config
const ITEMS = {
  apple: { key: "apple", emoji: "🍎", weight: 1, name: "苹果" },
  banana: { key: "banana", emoji: "🍌", weight: 2, name: "香蕉" },
  rabbit: { key: "rabbit", emoji: "🐰", weight: 3, name: "兔子" },
  lion: { key: "lion", emoji: "🦁", weight: 6, name: "狮子" },
  elephant: { key: "elephant", emoji: "🐘", weight: 12, name: "大象" }
};

// === 关卡生成器 Procedural Level Generator ===
function generateLevel(lvlNum) {
  const types = ["equal", "greater", "less"];
  // 难度演进: 1=平衡, 2=平衡/大于, 3+=混合
  let allowedTypes = ["equal"];
  if (lvlNum > 2) allowedTypes.push("greater");
  if (lvlNum > 4) allowedTypes.push("less");

  // 选择目标模式
  const mode = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

  // 关系图谱:
  // 苹果(1) < 香蕉(2) < 兔子(3) < 狮子(6) < 大象(12)
  const pairs = [
    { lg: ITEMS.banana, sm: ITEMS.apple, ratio: 2 },
    { lg: ITEMS.rabbit, sm: ITEMS.apple, ratio: 3 },
    { lg: ITEMS.lion, sm: ITEMS.banana, ratio: 3 },
    { lg: ITEMS.lion, sm: ITEMS.rabbit, ratio: 2 },
    { lg: ITEMS.elephant, sm: ITEMS.lion, ratio: 2 }
  ];

  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const smItem = pair.sm;
  const lgItem = pair.lg;

  // 左侧配置
  const leftCount = Math.floor(Math.random() * 2) + 1; // 1或2个大物品

  let text = "";
  let goal = ""; // 'equal', 'left_heavy', 'right_heavy'

  if (mode === "equal") {
    text = `已知: 1个${lgItem.emoji} = ${pair.ratio}个${smItem.emoji}。\n左边是 ${leftCount} 个${lgItem.name}。\n请在右边放${smItem.name}，让天平**平衡 (=)**。`;
    goal = "equal";
  } else if (mode === "greater") {
    text = `已知: 1个${lgItem.emoji} = ${pair.ratio}个${smItem.emoji}。\n左边是 ${leftCount} 个${lgItem.name}。\n请在右边放**足够多**的${smItem.name}，让右边变得**更重 (>)**！`;
    goal = "right_heavy";
  } else if (mode === "less") {
    text = `已知: 1个${lgItem.emoji} = ${pair.ratio}个${smItem.emoji}。\n左边是 ${leftCount} 个${lgItem.name}。\n请在右边放${smItem.name}，但要保持右边**比左边轻 (<)**。`;
    goal = "left_heavy";
  }

  return {
    id: lvlNum,
    title: mode === "equal" ? "天平平衡" : mode === "greater" ? "谁更重？" : "谁更轻？",
    text: text,
    goal: goal,
    leftConfig: Array(leftCount).fill(lgItem.key),
    inventory: Array(Math.min(8, leftCount * pair.ratio + 2)).fill(smItem.key) // 提供足够的物品
  };
}

let gameInstance = null;

// === Phaser 场景类 ===
class BalanceScene extends Phaser.Scene {
  constructor() {
    super("BalanceScene");
    this.leftItems = [];
    this.rightItems = [];
    this.inventoryItems = [];
  }

  preload() {
    const createEmojiTexture = (key, emoji) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.font = "48px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 32, 32);
      this.textures.addCanvas(key, canvas);
    };
    Object.values(ITEMS).forEach(i => createEmojiTexture(i.key, i.emoji));
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // === 布局 常量 ===
    const AREA_TOP = 100; // 顶部区域起始
    const AREA_BOTTOM = H - 160; // 物品栏区域起始
    const PLAY_H = AREA_BOTTOM - AREA_TOP;

    const BEAM_W = Math.min(340, W * 0.8);
    const CENTER_X = W / 2;
    const PIVOT_Y = AREA_TOP + PLAY_H * 0.25; // 天平支点上移

    // === 天平层 (Scale Layer) - Z序列较低 ===

    // 支柱
    this.add.rectangle(CENTER_X, PIVOT_Y + 140, 12, 280, 0x5d4037).setOrigin(0.5, 0.5);
    this.add.rectangle(CENTER_X, PIVOT_Y + 280, 120, 12, 0x5d4037).setOrigin(0.5, 0.5);
    this.add.circle(CENTER_X, PIVOT_Y, 6, 0xffca28).setDepth(20).setStrokeStyle(2, 0x5d4037);

    // 横梁容器
    this.beamContainer = this.add.container(CENTER_X, PIVOT_Y);
    const beam = this.add.rectangle(0, 0, BEAM_W, 8, 0xa1887f).setStrokeStyle(2, 0x5d4037);
    this.beamContainer.add(beam);

    const PAN_OFFSET = BEAM_W / 2 - 15;

    // 托盘容器
    this.leftPan = this.add.container(-PAN_OFFSET, 0);
    this.drawPan(this.leftPan);
    this.beamContainer.add(this.leftPan);

    this.rightPan = this.add.container(PAN_OFFSET, 0);
    this.drawPan(this.rightPan);
    this.beamContainer.add(this.rightPan);

    // 判定区域
    const zoneY = PIVOT_Y + 120;
    this.leftZone = this.add.zone(CENTER_X - PAN_OFFSET, zoneY, 140, 160).setRectangleDropZone(140, 160);
    this.rightZone = this.add.zone(CENTER_X + PAN_OFFSET, zoneY, 140, 160).setRectangleDropZone(140, 160);

    // === 物品栏层 (Shelf Layer) - Z序列最高 ===
    // 用于遮挡天平
    const SHELF_DEPTH = 100;

    const shelfBg = this.add.graphics();
    shelfBg.setDepth(SHELF_DEPTH);
    shelfBg.fillStyle(0xffe0b2, 0.95); // 高不透明度
    // 绘制覆盖底部的大背景
    shelfBg.fillRect(0, AREA_BOTTOM + 20, W, H - (AREA_BOTTOM + 20)); // 覆盖底部所有
    shelfBg.fillRoundedRect(20, AREA_BOTTOM + 10, W - 40, 150, 20); // 装饰框
    shelfBg.lineStyle(2, 0xffcc80, 1);
    shelfBg.strokeRoundedRect(20, AREA_BOTTOM + 10, W - 40, 150, 20);

    this.add
      .text(CENTER_X, AREA_BOTTOM + 25, "物 品 栏", {
        fontSize: "12px",
        color: "#8D6E63",
        fontFamily: "sans-serif",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(SHELF_DEPTH + 1);

    // === 交互逻辑 Logic ===
    this.input.on("dragstart", (pointer, gameObject) => {
      // 拖拽中，层级置顶
      gameObject.setDepth(SHELF_DEPTH + 10);
      this.tweens.add({ targets: gameObject, scale: 0.5, duration: 100 });

      if (gameObject.getData("isSource")) {
        gameObject.setData("isSource", false);
        // 从物品栏列表移除
        this.inventoryItems = this.inventoryItems.filter(i => i !== gameObject);
      }
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on("drop", (pointer, gameObject, dropZone) => {
      if (dropZone === this.leftZone) {
        this.addItemToPan(gameObject, "left");
      } else if (dropZone === this.rightZone) {
        this.addItemToPan(gameObject, "right");
      } else {
        // 放回物品栏
        this.returnToInventory(gameObject);
      }

      // 注意：放入托盘的物品，层级应该在 ShelfBg 之下吗？
      // 原需求是“物品栏挡住天平”。如果天平沉下去被物品栏挡住，
      // 那托盘里的物品也应该被挡住。
      // 所以托盘物品层级保持默认（0-99），低于 SHELF_DEPTH (100)。
      if (dropZone === this.leftZone || dropZone === this.rightZone) {
        gameObject.setDepth(10);
      }
    });

    this.input.on("dragend", (pointer, gameObject, dropped) => {
      if (!dropped) {
        this.returnToInventory(gameObject);
      }
    });
  }

  drawPan(container) {
    const string = this.add.line(0, 0, 0, 0, 0, 90, 0x8d6e63).setOrigin(0, 0).setLineWidth(2);
    const pan = this.add.graphics();
    pan.fillStyle(0xffecb3, 0.9);
    pan.lineStyle(2, 0xffb74d, 1);

    // 宽深碗型
    pan.beginPath();
    pan.moveTo(-60, 90);
    pan.lineTo(60, 90);
    pan.lineTo(50, 140);
    pan.lineTo(-50, 140);
    pan.closePath();
    pan.fillPath();
    pan.strokePath();

    container.add([string, pan]);
  }

  spawnItem(key, x, y) {
    const sprite = this.add.sprite(x, y, key).setInteractive({ draggable: true });
    sprite.setScale(0.35);
    return sprite;
  }

  setupLevel(lvlData, invY) {
    this.leftItems.forEach(i => i.destroy());
    this.rightItems.forEach(i => i.destroy());
    this.inventoryItems.forEach(i => i.destroy());
    this.leftItems = [];
    this.rightItems = [];
    this.inventoryItems = [];

    this.tweens.killAll();
    // 重置状态
    this.beamContainer.setRotation(0);
    this.leftPan.setRotation(0);
    this.rightPan.setRotation(0);

    // 左侧初始物品
    lvlData.leftConfig.forEach(key => {
      const sprite = this.spawnItem(key, 0, 0);
      this.addItemToPan(sprite, "left", true);
      sprite.setDepth(10);
    });

    // 物品栏布局 (平铺)
    const W = this.scale.width;
    const count = lvlData.inventory.length;
    const gap = 40;

    const maxPerRow = 6;
    const startX = (W - (Math.min(count, maxPerRow) - 1) * gap) / 2;

    const ITEM_DEPTH = 101; // 比背景高

    lvlData.inventory.forEach((key, idx) => {
      const r = Math.floor(idx / maxPerRow);
      const c = idx % maxPerRow;
      const tx = startX + c * gap;
      const ty = invY + 40 + r * 50 + 30;

      const sprite = this.spawnItem(key, tx, ty);
      sprite.setData("isSource", true);
      sprite.setDepth(ITEM_DEPTH);
      this.inventoryItems.push(sprite);
    });
  }

  returnToInventory(sprite) {
    this.removeFromPanLists(sprite);
    if (!this.inventoryItems.includes(sprite)) {
      this.inventoryItems.push(sprite);
    }
    sprite.setData("isSource", true);

    // 提升层级到物品栏
    sprite.setDepth(101);

    // 重新布局
    const W = this.scale.width;
    const H = this.scale.height;
    const invY = H - 160;

    const gap = 50;
    const maxPerRow = 6;
    const startX = (W - (Math.min(this.inventoryItems.length, maxPerRow) - 1) * gap) / 2;

    this.inventoryItems.forEach((item, idx) => {
      const r = Math.floor(idx / maxPerRow);
      const c = idx % maxPerRow;
      this.tweens.add({
        targets: item,
        x: startX + c * gap,
        y: invY + 40 + r * 50,
        scale: 0.35,
        duration: 200,
        ease: "Power2"
      });
    });
  }

  removeFromPanLists(sprite) {
    const lIdx = this.leftItems.indexOf(sprite);
    if (lIdx > -1) {
      this.leftItems.splice(lIdx, 1);
      this.layoutPanItems("left");
    }
    const rIdx = this.rightItems.indexOf(sprite);
    if (rIdx > -1) {
      this.rightItems.splice(rIdx, 1);
      this.layoutPanItems("right");
    }
  }

  addItemToPan(sprite, side, isFixed = false) {
    this.removeFromPanLists(sprite);
    const invIdx = this.inventoryItems.indexOf(sprite);
    if (invIdx > -1) this.inventoryItems.splice(invIdx, 1);

    const targetArray = side === "left" ? this.leftItems : this.rightItems;
    targetArray.push(sprite);

    if (sprite.parentContainer) sprite.parentContainer.remove(sprite);
    this.beamContainer.add(sprite);

    this.layoutPanItems(side);

    if (!isFixed) {
      sprite.setInteractive({ draggable: true });
      sprite.setData("isSource", false);
    }
  }

  layoutPanItems(side) {
    const items = side === "left" ? this.leftItems : this.rightItems;
    const panX = side === "left" ? this.leftPan.x : this.rightPan.x;

    const gap = 20;
    const totalW = (items.length - 1) * gap;
    const startX = panX - totalW / 2;

    items.forEach((item, index) => {
      this.tweens.add({
        targets: item,
        x: startX + index * gap,
        y: 125,
        scale: 0.35,
        duration: 200,
        ease: "Power2"
      });
    });
  }

  update() {
    const angle = -this.beamContainer.rotation;
    this.leftPan.setRotation(angle);
    this.rightPan.setRotation(angle);
    this.leftItems.forEach(i => i.setRotation(angle));
    this.rightItems.forEach(i => i.setRotation(angle));
  }

  verify(targetState) {
    const getWeight = arr => arr.reduce((sum, sprite) => sum + ITEMS[sprite.texture.key].weight, 0);
    const lW = getWeight(this.leftItems);
    const rW = getWeight(this.rightItems);

    const diff = rW - lW;
    let targetAngleDeg = diff * 4;
    targetAngleDeg = Phaser.Math.Clamp(targetAngleDeg, -25, 25);
    const targetRad = Phaser.Math.DegToRad(targetAngleDeg);

    this.tweens.add({
      targets: this.beamContainer,
      rotation: targetRad,
      duration: 1200,
      ease: "Elastic.easeOut",
      easeParams: [1, 0.5]
    });

    if (targetState === "equal") return lW === rW;
    if (targetState === "left_heavy") return lW > rW;
    if (targetState === "right_heavy") return rW > lW;
    return false;
  }
}

// === Vue 逻辑 Logic ===

onMounted(async () => {
  generateNewLevel();
  await nextTick();
  const container = document.getElementById("phaser-game-area");
  const w = container.clientWidth;
  const h = container.clientHeight;

  gameInstance = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "phaser-game-area",
    width: w,
    height: h,
    transparent: true,
    scene: BalanceScene,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: { default: "arcade" }
  });

  setTimeout(() => {
    if (levelData.value) syncLevelToScene();
  }, 100);
});

onUnmounted(() => {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }
});

function generateNewLevel() {
  levelData.value = generateLevel(level.value);
  questionText.value = levelData.value.text;
}

function syncLevelToScene() {
  if (!gameInstance || !levelData.value) return;
  const scene = gameInstance.scene.getScene("BalanceScene");
  if (scene) {
    const H = scene.scale.height;
    const invY = H - 160;
    scene.setupLevel(levelData.value, invY);
  }
}

function onVerify() {
  const scene = gameInstance.scene.getScene("BalanceScene");
  if (!scene) return;

  const isWin = scene.verify(levelData.value.goal);

  if (isWin) {
    Snackbar.success("回答正确！");
    setTimeout(() => {
      showPassDialog();
    }, 1500);
  } else {
    Snackbar.warning("结果好像不对哦，再试一次！");
  }
}

function showPassDialog() {
  Dialog({
    title: "🎉 挑战成功",
    message: "小脑瓜真聪明！来试试下一关？",
    confirmButtonText: "下一关",
    cancelButtonText: "重玩本关"
  }).then(action => {
    if (action === "confirm") {
      level.value++;
      generateNewLevel();
      syncLevelToScene();
    } else {
      syncLevelToScene();
    }
  });
}

function onReset() {
  syncLevelToScene();
}
</script>

<template>
  <div class="h-screen w-screen bg-[#FFF8E1] flex flex-col font-sans overflow-hidden select-none">
    <div class="h-16 px-4 flex items-center justify-between shrink-0 relative z-20">
      <var-button round text color="transparent" text-color="#5D4037" @click="router.back()">
        <var-icon name="arrow-left" size="28" />
      </var-button>
      <div class="flex flex-col items-center">
        <div class="text-[#8D6E63] font-black tracking-widest text-sm uppercase">Level {{ level }}</div>
        <div class="w-12 h-1 bg-[#8D6E63]/20 rounded-full mt-1">
          <div
            class="h-full bg-[#FFCA28] rounded-full transition-all duration-300"
            :style="{ width: `${Math.min(100, level * 10)}%` }"
          ></div>
        </div>
      </div>
      <var-button round text color="transparent" text-color="#5D4037" @click="onReset">
        <var-icon name="refresh" size="26" />
      </var-button>
    </div>

    <div class="px-6 pb-2 shrink-0 relative z-20">
      <div class="bg-white rounded-2xl shadow-sm border border-[#FFE0B2] p-4 relative">
        <div
          class="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-[#FFE0B2] transform rotate-45"
        ></div>
        <h2 class="font-bold text-[#5D4037] text-lg leading-snug text-center" v-if="levelData">
          {{ levelData.title }}
        </h2>
        <p class="text-[#8D6E63] text-sm mt-2 text-center leading-relaxed whitespace-pre-wrap font-medium">
          {{ questionText }}
        </p>
      </div>
    </div>

    <div id="phaser-game-area" class="flex-1 w-full relative z-10 overflow-hidden"></div>

    <div class="absolute bottom-48 left-0 w-full flex justify-center z-30 pointer-events-none">
      <var-button
        class="pointer-events-auto transform transition-transform active:scale-95 shadow-lg shadow-green-200/50"
        color="#43a047"
        text-color="#fff"
        size="normal"
        radius="20"
        @click="onVerify"
      >
        <var-icon name="check" size="20" class="mr-2" />
        <span class="font-bold text-lg">平衡验证</span>
      </var-button>
    </div>
  </div>
</template>

<style scoped>
:deep(canvas) {
  display: block;
  touch-action: none;
}
</style>
