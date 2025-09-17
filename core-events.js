/**
 * EventBus - 模块间通信协调器
 * 
 * 核心功能：
 * - 发布/订阅模式事件系统，解耦模块依赖
 * - 事件监听器注册、触发和自动清理
 * - 支持一次性监听器和持久监听器
 * - 避免重复监听冲突，确保事件传递可靠性
 */

export class EventBus {
  constructor() {
    this.events = new Map();
    this.debugMode = false;
  }

  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅的函数
   */
  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }

    this.events.get(eventName).add(callback);

    // 返回取消订阅的函数
    return () => this.off(eventName, callback);
  }

  /**
   * 订阅一次性事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   */
  once(eventName, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(eventName, wrapper);
    };

    this.on(eventName, wrapper);
  }

  /**
   * 取消订阅
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(eventName, callback) {
    if (this.events.has(eventName)) {
      this.events.get(eventName).delete(callback);

      // 如果没有监听器了，删除事件
      if (this.events.get(eventName).size === 0) {
        this.events.delete(eventName);
      }
    }
  }

  /**
   * 发布事件
   * @param {string} eventName - 事件名称
   * @param {...any} args - 事件参数
   */
  emit(eventName, ...args) {
    if (this.debugMode) {
      console.log(`[EventBus] 发布事件: ${eventName}`, args);
    }

    if (this.events.has(eventName)) {
      const callbacks = this.events.get(eventName);
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[EventBus] 事件处理器错误 (${eventName}):`, error);
        }
      });
    }
  }

  /**
   * 清除所有事件
   */
  clear() {
    this.events.clear();
  }

  /**
   * 清除特定事件的所有监听器
   * @param {string} eventName - 事件名称
   */
  clearEvent(eventName) {
    this.events.delete(eventName);
  }

  /**
   * 获取事件监听器数量
   * @param {string} eventName - 事件名称
   * @returns {number} 监听器数量
   */
  getListenerCount(eventName) {
    return this.events.has(eventName) ? this.events.get(eventName).size : 0;
  }

  /**
   * 获取所有事件名称
   * @returns {Array} 事件名称数组
   */
  getEventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * 设置调试模式
   * @param {boolean} enabled - 是否启用调试
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}