export class TiltController {
  constructor(options = {}) {
    this.threshold = options.threshold || 30; // 触发角度阈值 (默认为30，更灵敏)
    this.resetZone = options.resetZone || 10; // 回正区域
    this.onSuccess = options.onSuccess; // 正确回调
    this.onPass = options.onPass; // 跳过回调

    this.isLocked = false;
    this.handleEvent = this._onDeviceOrientation.bind(this);

    // 零点校准
    this.initialBeta = null;
    this.calibrating = false;
  }

  /**
   * 必须由用户点击事件触发（iOS 强制要求）
   */
  async active() {
    // 重置状态
    this.isLocked = false;
    this.initialBeta = null;

    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          console.error("用户拒绝了传感器权限");
          return false;
        }
      } catch (e) {
        console.error("Permission request failed", e);
        return false;
      }
    }

    window.addEventListener("deviceorientation", this.handleEvent);
    return true;
  }

  /**
   * 校准零点（建议在倒计时结束时调用）
   */
  calibrate() {
    this.calibrating = true;
    this.initialBeta = null; // 强制下次采样为零点
    console.log("正在校准零点...");
  }

  _onDeviceOrientation(event) {
    let { beta } = event;
    if (beta === null) return;

    // 动态零点校准 logic
    if (this.calibrating || this.initialBeta === null) {
      this.initialBeta = beta;
      this.calibrating = false;
      console.log("零点已校准: " + beta);
      return;
    }

    // 计算相对偏移量
    const delta = beta - this.initialBeta;

    // 逻辑锁：防止一次动作触发多次判罚
    if (!this.isLocked) {
      // 阈值判定 (依据用户需求：nodding vs tilting back)
      // 在大多数设备横屏下，beta 增加通常对应 'Top Back' (仰头)，减少对应 'Top Forward' (点头)
      // 用户 snippet: beta > threshold -> SUCCESS.
      // 我们暂且遵循 snippet 逻辑: Positive Delta -> Success.
      // 如果实际反了，可以在这里取反。

      if (delta > this.threshold) {
        this._trigger("PASS"); // 仰头 Pass
      } else if (delta < -this.threshold) {
        this._trigger("SUCCESS"); // 点头 Correct (Delta is negative)
      }
    } else {
      // 只有回到初始范围，才释放锁
      if (Math.abs(delta) < this.resetZone) {
        this.isLocked = false;
      }
    }
  }

  _trigger(type) {
    this.isLocked = true;

    // 给物理反馈，真人互动中“震动”比音效更直观
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    if (type === "SUCCESS") {
      this.onSuccess?.();
    } else {
      this.onPass?.();
    }
  }

  destroy() {
    window.removeEventListener("deviceorientation", this.handleEvent);
  }
}
