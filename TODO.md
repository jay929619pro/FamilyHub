# 🚀 FamilyHub 开发清单 (Game C: Sudoku)

## 🟢 Phase 1: 数独引擎与架构 (Core Engine)

**目标**：实现一个能生成题目、校验答案的“数学大脑”。

- [ ] **后端架构隔离**

  - [ ] 创建 `server/controllers/sudoku.js`，实现独立的 `SudokuController` 类。
  - [ ] 在 `server/index.js` 中挂载数独专属的 Socket 命名空间 `/sudoku` (如果支持) 或通过 `gameType: 'sudoku'` 分流。

- [ ] **数独算法实现 (Algorithm)**
  - [ ] **Board Generator**:
    - 实现 `generateBoard(size)` 函数 (支持 4x4 和 6x6)。
    - 算法：随机填入首行 -> 回溯法填满 -> 随机挖空 (Digging) -> 保证唯一解。
  - [ ] **Validator**:
    - 实现 `checkMove(board, row, col, value)` 实时校验合法性。
    - 实现 `checkWin(board)` 全局完成判定。

## 🟡 Phase 2: 游戏界面与交互 (UI/UX)

**目标**：让 6 岁的一年级小学生也能看懂、能操作。

- [ ] **棋盘组件 (SudokuGrid)**

  - [ ] **Responsive Grid**: 使用 CSS Grid 实现 4x4 (2x2 zones) 和 6x6 (3x2 zones) 布局。
  - [ ] **Zone Highlighting**: 使用斑马纹或不同底色区分宫 (Zone)，降低视觉认知负担。
  - [ ] **Interaction**:
    - `Active Cell`: 点击格子高亮，并联动键盘。
    - `Conflict Highlight`: 填错时，高亮冲突的行/列/宫。

- [ ] **输入面板 (Keypad)**

  - [ ] 适配数字 `1-6` 和 图标模式 (🍎-🍊)。
  - [ ] 增加 `Erase` (橡皮擦) 和 `Note` (标记) 模式切换。

- [ ] **亲子协作功能 (Co-op)**
  - [ ] **实时同步**：任何人的操作都会通过 Socket 广播给所有人 (Board State Sync)。
  - [ ] **教练指令**：
    - 父母端增加“提示”按钮：点击后，高亮宝宝当前选中格子的相关区域 (Row/Col/Zone)。

## 🔵 Phase 3: 游戏化与正反馈 (Gamification)

**目标**：把做题变成闯关。

- [ ] **关卡系统**

  - [ ] Level 1 (4x4, 简单, 水果) -> Level 2 (4x4, 数字) -> Level 3 (6x6, 简单) ...
  - [ ] 胜利结算画面：显示“逻辑小天才”奖状。

- [ ] **错误保护**
  - [ ] 错误超过 3 次不判定失败，而是触发“求助爸爸”弹窗。
