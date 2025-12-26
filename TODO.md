# 🚀 FamilyHub 开发清单

## 🟢 Phase 1: 数独引擎与架构 (Game C: Sudoku) - ✅ 已完成

## 🔵 Phase 4: Game D - 逻辑大师 (Logic Master)

**目标**：全方位数学思维训练框架 (Vue Based)。

- [ ] **框架搭建**

  - [ ] 创建 `src/views/LogicMaster.vue` (通用容器)。
  - [ ] 设计 `QuestionCard` 组件接口 (Slot & Props)。
  - [ ] 状态管理 `useLogicGame.js` (关卡进度、错误统计)。

- [ ] **题型组件开发 (Puzzle Components)**

  - [ ] **PatternMatcher.vue (找规律)**: 实现序列渲染与选项点击。
  - [ ] **VisualBalance.vue (代数天平)**: 移植并简化 MagicBalance 逻辑为静态答题模式。
  - [ ] **CubeCounter.vue (数方块)**: 使用 CSS 3D 或预渲染图片实现数立方体。

- [ ] **内容生成**
  - [ ] 编写 `LevelGenerator.js`：支持多种题型的随机生成算法。
  - [ ] 接入 `confetti` 庆祝特效。

## 🟣 Phase 5: Game E - 小小程序员 (Code The Way)

**目标**：计算思维与空间规划。

- [ ] **待启动** (排期在 Game D 之后)

## 🟤 Phase 6: Game F - 速算大乱斗 (Make 10)

**目标**：心算速度与数感。

- [ ] **待启动** (排期在 Game E 之后)
