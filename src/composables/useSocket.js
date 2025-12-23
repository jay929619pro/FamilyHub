import { io } from "socket.io-client";
import { useGameStore } from "../store/game";

// 保持 Socket 单例，避免组件重新渲染导致重复连接
let socket = null;

export function useSocket() {
  const gameStore = useGameStore();

  /**
   * 初始化并连接 Socket
   * @returns {Socket} socket 实例
   */
  function connect() {
    if (socket && socket.connected) return socket;

    // 动态获取当前 hostname，端口固定 3000 (开发环境)
    // 生产环境通常直接用 relative path 或环境变量
    const host = window.location.hostname;
    const port = "3000";
    const url = `http://${host}:${port}`;

    socket = io(url, {
      transports: ["websocket"], // 强制使用 websocket，性能更好
      autoConnect: true,
      reconnection: true
    });

    _setupListeners();

    return socket;
  }

  /**
   * 注册所有的全局事件监听
   * 注意：特定于组件的事件（如 draw）建议在组件 onMounted 中单独监听
   */
  function _setupListeners() {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("✅ [Socket] Connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.warn("❌ [Socket] Disconnected");
    });

    socket.on("connect_error", err => {
      console.error("⚠️ [Socket] Connection Error:", err.message);
    });

    // 1. 监听游戏全量/增量状态更新
    socket.on("stateUpdate", payload => {
      console.log("📥 [Socket] stateUpdate:", payload);
      gameStore.updateState(payload);
    });

    // 监听倒计时 (高频)
    socket.on("timerTick", seconds => {
      gameStore.updateTimer(seconds);
    });

    // 监听回合结束
    socket.on("round_end", () => {
      // 可以在这里触发全局音效或震动
      console.log("🔔 Round End!");
    });

    // 2. 监听绘画轨迹 (全局层面的处理)
    // 架构建议：此处仅做日志或调试。
    // 实际的画板绘制逻辑，应该在 Canvas 组件中通过 socket.on('draw', executeDrawing) 直接处理，
    // 不要经过 Pinia，否则会卡顿。
    socket.on("draw", data => {
      // 可以在这里做一些非渲染层面的处理，比如统计数据量
      // console.debug('🖌️ [Socket] draw data received', data.length)
    });
  }

  /**
   * 获取当前的 socket 实例 (如果需要手动 emit 事件)
   */
  function getSocket() {
    return socket;
  }

  /**
   * 断开连接 (通常在 App 卸载时调用)
   */
  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  return {
    connect,
    disconnect,
    getSocket
  };
}
