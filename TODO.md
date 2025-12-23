🚀 FamilyHub 2.0 完整开发任务清单
第一阶段：游戏生命周期管理 (Core Loop)
目标：让应用从“同步画板”进化为“有开端和结局的游戏”。

[x] 后端计时器逻辑：server/index.js 引入 roundTimer。 - 实现 startGame，开始 60s 倒计时。 - 每秒广播 timerTick。 - 倒计时结束触发 roundEnd，锁定画板。

[x] 自动轮转机制： - 管理员或画手一键“下一局”。 - 后端自动更新 currentDrawerId，状态流转正确。

[x] 游戏结算状态： - status: waiting -> playing -> result。 - result 状态下展示最高分。

第二阶段：宝宝与长辈的交互增强 (UX/Accessibility)
目标：消除认知障碍，让 6 岁宝宝和长辈无需指导也能玩。

[x] 语音辅助 (TTS)： - 前端集成 window.speechSynthesis。 - 画家模式下自动播报“请画出：[词语]”。

[x] 拼音与视觉优化： - 题目区域 pinyin-pro 生僻字注音。 - 画家与猜题者界面显着区分。

[x] 动效反馈： - 得分时头像放大并飘出 +10。 - result 遮罩层动画。

第三阶段：系统健壮性 (Stability)
目标：解决局域网环境下手机息屏、掉线等常见问题。

[ ] 状态重连同步 (Reconnection)：

前端 socket.io 连接时，若发生断开重连，自动发送 syncRequest。

后端返回当前完整的 gameState（包括当前题目、剩余时间、画板当前快照）。

[ ] 防止屏幕休眠：

引入 WakeLock API（如果浏览器支持），防止大家在思考怎么画时手机突然黑屏。

[ ] 环境适配优化：

增加 resize 监听，当 iPad 旋屏时，自动重新计算 Canvas 的物理尺寸，保证 2000x2000 虚拟坐标映射不失效。

第四阶段：词库与扩展 (Content)
目标：增加耐玩度。

[ ] 分级词库管理：

建立 words.json，分为 kids（简单事物）、family（家庭成员梗）、pro（成语/抽象词）。

界面增加开关，允许勾选本次游戏使用的词库。

[ ] 图片保存：

增加“保存到相册”功能，将大家画得有趣的画（连同得分）生成一张海报图。
