/**
 * UI基类 - 所有UI模块的基础类
 * 提供通用的UI功能和接口
 * 
 * 修改记录：
 * - 2025-09-06: 创建UI基类，提供统一接口
 */

export class UIBase {
  constructor(module) {
    this.module = module;
    this.container = null;
    this.initialized = false;
  }

  /**
   * 初始化UI
   * @param {HTMLElement} container - UI容器
   */
  async init(container) {
    this.container = container;

    // 渲染UI
    this.render();

    // 绑定事件
    this.bindEvents();

    // 初始化完成
    this.initialized = true;

    // 调用子类的初始化后处理
    if (this.afterInit) {
      await this.afterInit();
    }
  }

  /**
   * 渲染UI - 子类必须实现
   */
  render() {
    throw new Error('子类必须实现render方法');
  }

  /**
   * 绑定事件 - 子类可以重写
   */
  bindEvents() {
    // 子类实现具体的事件绑定
  }

  /**
   * 刷新UI
   */
  refresh() {
    if (!this.container) return;

    // 清空容器
    this.container.innerHTML = '';

    // 重新渲染
    this.render();

    // 重新绑定事件
    this.bindEvents();
  }

  /**
   * 销毁UI
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }

    this.initialized = false;

    // 调用子类的销毁处理
    if (this.onDestroy) {
      this.onDestroy();
    }
  }

  /**
   * 显示UI
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * 隐藏UI
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * 查询元素
   * @param {string} selector - CSS选择器
   * @returns {HTMLElement|null}
   */
  $(selector) {
    return this.container ? this.container.querySelector(selector) : null;
  }

  /**
   * 查询所有元素
   * @param {string} selector - CSS选择器
   * @returns {NodeList}
   */
  $$(selector) {
    return this.container ? this.container.querySelectorAll(selector) : [];
  }

  /**
   * 创建元素
   * @param {string} html - HTML字符串
   * @returns {HTMLElement}
   */
  createElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  /**
   * 添加事件监听器（自动清理）
   */
  addEventListener(element, event, handler) {
    if (!element) return;

    // 保存监听器以便清理
    if (!this._listeners) {
      this._listeners = [];
    }

    this._listeners.push({ element, event, handler });
    element.addEventListener(event, handler);
  }

  /**
   * 清理所有事件监听器
   */
  cleanupListeners() {
    if (this._listeners) {
      this._listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this._listeners = [];
    }
  }

  /**
   * 显示加载中
   */
  showLoading() {
    if (!this.container) return;

    const loading = this.createElement(`
      <div class="ui-loading">
        <i class="fa fa-spinner fa-spin"></i>
        <span>加载中...</span>
      </div>
    `);

    this.container.appendChild(loading);
  }

  /**
   * 隐藏加载中
   */
  hideLoading() {
    const loading = this.$('.ui-loading');
    if (loading) {
      loading.remove();
    }
  }

  /**
   * 显示消息
   */
  showMessage(message, type = 'info') {
    const messageEl = this.createElement(`
      <div class="ui-message ui-message-${type}">
        ${message}
      </div>
    `);

    this.container.appendChild(messageEl);

    // 3秒后自动移除
    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }

  /**
   * 确认对话框
   */
  confirm(message) {
    return window.confirm(message);
  }

  /**
   * 输入对话框
   */
  prompt(message, defaultValue = '') {
    return window.prompt(message, defaultValue);
  }
}