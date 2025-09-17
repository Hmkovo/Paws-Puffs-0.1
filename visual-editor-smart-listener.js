/**
 * 智能监听协调器 - 统一管理所有DOM监听需求
 * 
 * 核心功能：
 * - 创作者/使用者模式智能切换
 * - 统一输入框监听（CSS编译 + 装饰检测）  
 * - 智能聊天区监听（仅在需要时启用）
 * - 智能设置面板检测（仅创作者模式）
 * - 性能优化：按需启用监听器
 */

export class SmartListenerCoordinator {
  constructor(visualEditor, cssPreprocessor) {
    this.visualEditor = visualEditor;
    this.cssPreprocessor = cssPreprocessor;

    // 模式状态
    this.mode = 'user'; // 'creator' 或 'user' 
    this.modeTimer = null;
    this.creatorModeTimeout = 60000; // 1分钟创作者模式超时

    // 监听器管理
    this.activeListeners = new Set();
    this.observers = {
      settings: null,        // 设置面板检测
      chat: null,           // 聊天区装饰应用
      input: null           // 输入框监听器（不是Observer）
    };

    // 防抖处理
    this.debounceTimer = null;
    this.debounceDelay = 300;

    // 缓存
    this.lastProcessedCSS = '';
    this.lastInputActivity = 0;

    // 🔄 同步状态标志（防循环）
    this.isSync = false;

  }

  /**
   * 初始化协调器
   */
  init() {

    // 默认启动使用者模式（只监听聊天区）
    this.switchToUserMode();

    // 监听输入框获得焦点事件（创作者模式触发）
    this.setupInputFocusDetection();

  }

  /**
   * 设置输入框焦点检测
   * 用于自动切换到创作者模式
   */
  setupInputFocusDetection() {
    const customCSS = document.querySelector('#customCSS');
    if (!customCSS) {
      console.warn('[SmartListener] 未找到#customCSS输入框');
      return;
    }

    // 监听焦点和输入事件
    customCSS.addEventListener('focus', () => {
      this.switchToCreatorMode('input-focus');
    });

    customCSS.addEventListener('input', (e) => {
      this.switchToCreatorMode('input-change');
      this.handleInputChange(e.target.value);
    });

    customCSS.addEventListener('paste', (e) => {
      setTimeout(() => {
        this.switchToCreatorMode('input-paste');
        this.handleInputChange(e.target.value);
      }, 50);
    });

  }

  /**
   * 处理输入框内容变化
   * 防抖处理，统一分发给各功能模块
   */
  handleInputChange(cssText) {
    // 🚨 防循环检查：如果正在同步输入框显示，跳过处理
    if (this.isSync) {
      return;
    }

    // 记录活动时间
    this.lastInputActivity = Date.now();

    // 防抖处理
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processInputChange(cssText);
    }, this.debounceDelay);
  }

  /**
   * 处理输入内容变化的核心逻辑
   * 分发给CSS编译器和装饰处理器
   */
  processInputChange(cssText) {
    if (cssText === this.lastProcessedCSS) {
      return; // 避免重复处理
    }

    this.lastProcessedCSS = cssText;


    // 1. CSS编译检测和处理
    this.handleCSSCompilation(cssText);

    // 2. 装饰语法检测和处理  
    this.handleDecorationSyntax(cssText);
  }

  /**
   * 处理CSS编译
   * 检测中文CSS并触发实时编译
   */
  handleCSSCompilation(cssText) {
    // 检测是否包含中文CSS
    const hasChineseCSS = this.detectChineseCSS(cssText);

    if (hasChineseCSS && this.mode === 'creator') {

      // 触发CSS编译（调用visual-editor的编译逻辑）
      if (this.visualEditor && typeof this.visualEditor.triggerCSSCompilation === 'function') {
        this.visualEditor.triggerCSSCompilation(cssText);
      } else {
        console.warn('[SmartListener] CSS编译方法不可用');
      }
    }
  }

  /**
   * 处理装饰语法
   * 检测@装饰语法并触发处理
   */
  handleDecorationSyntax(cssText) {
    // 检测是否包含@装饰语法
    const hasDecorationSyntax = this.detectDecorationSyntax(cssText);

    if (hasDecorationSyntax) {

      // 触发装饰处理
      if (this.cssPreprocessor && typeof this.cssPreprocessor.handleCSSChange === 'function') {
        this.cssPreprocessor.handleCSSChange(cssText, 'smart-coordinator');
      } else {
        console.warn('[SmartListener] 装饰处理方法不可用');
      }
    }
  }

  /**
   * 切换到创作者模式
   */
  switchToCreatorMode(trigger = 'unknown') {
    if (this.mode === 'creator') {
      // 重新设置定时器
      this.resetCreatorModeTimer();
      return;
    }

    this.mode = 'creator';

    // 启用全部监听器
    this.enableSettingsListener();
    this.enableChatListener();
    // 输入框监听始终启用

    this.activeListeners.add('settings');
    this.activeListeners.add('chat');
    this.activeListeners.add('input');

    // 设置自动切换定时器
    this.resetCreatorModeTimer();

  }

  /**
   * 切换到使用者模式
   */
  switchToUserMode(trigger = 'timeout') {
    if (this.mode === 'user' && trigger !== 'init') {
      return;
    }

    this.mode = 'user';

    // 只保留聊天区监听（新消息仍需装饰）
    this.disableSettingsListener();
    this.enableChatListener(); // 确保聊天区监听保持启用

    this.activeListeners.delete('settings');
    this.activeListeners.add('chat');
    this.activeListeners.add('input'); // 输入框始终监听（用于模式切换）

    // 清除定时器
    if (this.modeTimer) {
      clearTimeout(this.modeTimer);
      this.modeTimer = null;
    }

  }

  /**
   * 重置创作者模式定时器
   */
  resetCreatorModeTimer() {
    if (this.modeTimer) {
      clearTimeout(this.modeTimer);
    }

    this.modeTimer = setTimeout(() => {
      this.switchToUserMode('timeout');
    }, this.creatorModeTimeout);
  }

  /**
   * 启用设置面板监听
   * 监听document.body，检测设置面板出现
   */
  enableSettingsListener() {
    if (this.observers.settings) {
      return; // 已启用
    }

    this.observers.settings = new MutationObserver(() => {
      if (this.visualEditor.enabled && !this.visualEditor.panelInserted) {
        const customCSSBlock = document.querySelector('#CustomCSS-textAreaBlock');
        if (customCSSBlock) {
          this.visualEditor.insertEditorPanel();
        }
      }
    });

    this.observers.settings.observe(document.body, {
      childList: true,
      subtree: true
    });

  }

  /**
   * 禁用设置面板监听
   */
  disableSettingsListener() {
    if (this.observers.settings) {
      this.observers.settings.disconnect();
      this.observers.settings = null;
    }
  }

  /**
   * 启用聊天区监听
   * 监听#chat，应用装饰到新消息
   */
  enableChatListener() {
    if (this.observers.chat) {
      return; // 已启用
    }

    this.observers.chat = new MutationObserver((mutations) => {
      const newNodes = [];

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            newNodes.push(node);
            if (node.querySelectorAll) {
              newNodes.push(...node.querySelectorAll('*'));
            }
          }
        });
      });

      if (newNodes.length > 0) {
        this.cssPreprocessor.processNewNodes(newNodes);
      }
    });

    const chatContainer = document.querySelector('#chat');
    if (chatContainer) {
      this.observers.chat.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    } else {
      console.warn('[SmartListener] 未找到#chat聊天容器');
    }
  }

  /**
   * 禁用聊天区监听
   */
  disableChatListener() {
    if (this.observers.chat) {
      this.observers.chat.disconnect();
      this.observers.chat = null;
    }
  }

  /**
   * 检测中文CSS
   */
  detectChineseCSS(cssText) {
    return /[\u4e00-\u9fa5]/.test(cssText) &&
      (cssText.includes('字体大小') ||
        cssText.includes('像素') ||
        cssText.includes('消息文本') ||
        cssText.includes('时间戳'));
  }

  /**
   * 检测装饰语法
   */
  detectDecorationSyntax(cssText) {
    return /@[^:：{]+[：:][^{]+\s*\{[^}]+\}/g.test(cssText);
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      mode: this.mode,
      activeListeners: Array.from(this.activeListeners),
      hasSettingsListener: !!this.observers.settings,
      hasChatListener: !!this.observers.chat,
      lastInputActivity: this.lastInputActivity
    };
  }

  /**
   * 销毁协调器
   */
  destroy() {

    // 清除所有定时器
    if (this.modeTimer) {
      clearTimeout(this.modeTimer);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 断开所有观察器
    this.disableSettingsListener();
    this.disableChatListener();

    // 清空状态
    this.activeListeners.clear();

  }
}
