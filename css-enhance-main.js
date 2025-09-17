/**
 * CSS增强模块 - JavaScript提取执行器
 * 
 * 核心功能：
 * - 从CSS中提取<script>标签并安全执行JavaScript代码
 * - 监听#customCSS输入框变化，实时处理内容
 * - 发送EventBus事件，与其他模块协调工作
 * - 防止重复执行，智能清理失效代码
 */

import { CssEnhanceUI } from './css-enhance-ui.js';
import { CssProcessor } from './css-enhance-processor.js';

export class CssEnhanceModule {
  constructor(extension) {
    this.extension = extension;
    this.storage = extension.storage;
    this.eventBus = extension.eventBus;
    this.coreEngine = extension.coreEngine;

    // 初始化处理器
    this.processor = new CssProcessor(this.coreEngine);

    // 初始化UI
    this.ui = null;

    // 当前状态
    this.currentTextarea = null;
    this.currentCSSContent = '';
    this.lastProcessedContent = null;
    this.textareaObserver = null;
    this.appliedStyleId = null; // 记录当前应用的样式ID

    // 主题切换监听器
    this.themeObserver = null;

    // CSS增强功能启用状态
    this.cssEnhanceEnabled = true;

    // 模块设置
    this.settings = {
      enabled: true,  // 这是整个扩展的启用状态
      realTimeUpdate: true,
      autoCleanOnThemeChange: true
    };

    this.moduleId = 'css-enhance';
  }

  /**
   * 初始化模块
   */
  async init() {
    // 加载设置
    await this.loadSettings();

    // 加载CSS增强功能启用状态
    const savedEnabled = await this.storage.get('cssEnhanceEnabled');
    this.cssEnhanceEnabled = savedEnabled !== false; // 默认启用

    // 监听自定义CSS输入框
    this.watchCustomCSSTextarea();

    // 设置事件监听
    this.setupEventListeners();

    // 设置主题变化监听（增强版）
    this.setupThemeWatcher();

    console.log('[CssEnhanceModule] CSS增强模块初始化完成，功能状态:', this.cssEnhanceEnabled);
  }

  /**
   * 设置CSS增强功能启用状态
   * 修改：移除自动清理逻辑
   */
  async setCssEnhanceEnabled(enabled) {
    this.cssEnhanceEnabled = enabled;
    await this.storage.set('cssEnhanceEnabled', enabled);

    if (enabled) {
      // 启用时，如果有内容则重新处理
      if (this.currentTextarea && this.currentTextarea.value) {
        this.lastProcessedContent = null; // 重置以强制重新处理
        this.handleCSSChange(this.currentTextarea.value);
      }
    }
    // 移除了禁用时的自动清理逻辑
    // 用户可以通过"清除"按钮手动清理

    // 发布状态变化事件
    this.eventBus.emit('cssEnhance:enabledChanged', enabled);

    console.log('[CssEnhanceModule] CSS增强功能', enabled ? '已启用' : '已禁用');
  }

  /**
   * 设置主题监听器（修复版）
   */
  setupThemeWatcher() {
    // 1. 监听主题下拉框变化（最直接的方式）
    $(document).on('change', '#themes', () => {
      console.log('[CssEnhanceModule] 检测到主题切换（通过下拉框）');
      // 延迟执行，等待SillyTavern处理完成
      setTimeout(() => this.onThemeChange(), 100);
    });

    // 2. 监听data-theme属性变化（备用）
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme' &&
          mutation.target === document.body) {
          console.log('[CssEnhanceModule] 检测到主题变化（data-theme）');
          setTimeout(() => this.onThemeChange(), 100);
        }
      });
    });

    if (document.body) {
      this.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }

  }

  /**
   * 加载设置
   */
  async loadSettings() {
    const saved = await this.storage.get('cssEnhanceSettings');
    if (saved) {
      this.settings = { ...this.settings, ...saved };
    }
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    await this.storage.set('cssEnhanceSettings', this.settings);
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听全局设置变化
    this.eventBus.on('settings:changed', (settings) => {
      if (settings.realTimeUpdate !== undefined) {
        this.settings.realTimeUpdate = settings.realTimeUpdate;
        this.saveSettings();
      }
    });

    // 监听扩展启用/禁用
    this.eventBus.on('extension:toggle', (enabled) => {
      this.settings.enabled = enabled;
      if (!enabled) {
        this.disable();
      } else {
        this.enable();
      }
    });
  }

  /**
   * 监听自定义CSS输入框
   */
  watchCustomCSSTextarea() {
    let checkCount = 0;
    const maxChecks = 100; // 最多检查100次（10秒）

    const checkTextarea = setInterval(() => {
      checkCount++;

      const textarea = document.getElementById('customCSS');

      if (textarea && textarea !== this.currentTextarea) {
        // 发现新的textarea
        console.log('[CssEnhanceModule] 找到CSS输入框');

        // 清理旧的监听器
        if (this.currentTextarea && this.textareaHandler) {
          this.currentTextarea.removeEventListener('input', this.textareaHandler);
        }

        this.currentTextarea = textarea;
        this.currentCSSContent = textarea.value;

        // 添加新的事件监听
        this.textareaHandler = this.settings.realTimeUpdate
          ? (e) => this.handleCSSChange(e.target.value)
          : this.debounce((e) => this.handleCSSChange(e.target.value), 500);

        textarea.addEventListener('input', this.textareaHandler);

        // 标记已初始化
        textarea.setAttribute('data-enhanced-initialized', 'true');

        // 初始处理（需要同时检查两个启用状态）
        if (this.settings.enabled && this.cssEnhanceEnabled && textarea.value) {
          this.handleCSSChange(textarea.value);
        }

        clearInterval(checkTextarea);
      }

      // 达到最大检查次数后停止
      if (checkCount >= maxChecks) {
        clearInterval(checkTextarea);
        console.log('[CssEnhanceModule] 停止查找CSS输入框');
      }
    }, 100);
  }

  /**
   * 处理CSS内容变化
   * 修改：简化禁用逻辑，不自动清理
   */
  handleCSSChange(content) {
    // 🔧 修复：发送CSS变化事件，让智能协调器能够接收通知
    this.eventBus.emit('css:input:change', {
      cssText: content,
      source: 'css-enhance'
    });

    // 检查两个启用状态：扩展全局启用 和 CSS增强功能启用
    if (!this.settings.enabled || !this.cssEnhanceEnabled) {
      // 功能被禁用时，直接返回，不处理内容也不清理
      return;
    }

    // 如果内容没有实质变化，跳过处理
    if (content === this.lastProcessedContent) {
      return;
    }

    this.currentCSSContent = content;
    this.lastProcessedContent = content;

    // 使用CSS处理器处理内容
    const result = this.processor.process(content);

    // 应用处理结果
    if (result.css) {
      // 记录样式ID，方便后续清理
      this.appliedStyleId = 'enhanced-main-css';
      this.coreEngine.applyCSS(result.css, this.appliedStyleId);
    }

    if (result.javascript) {
      this.coreEngine.executeScript(result.javascript);
    }

    if (result.addCommands && result.addCommands.length > 0) {
      this.processor.executeAddCommands(result.addCommands);
    }

    // 发布处理完成事件
    this.eventBus.emit('css:processed', result);

    if (this.extension.settings.debugMode) {
      console.log('[CssEnhanceModule] 处理CSS完成', result);
    }
  }

  /**
   * 处理主题变化（修复版）
   */
  onThemeChange() {
    if (this.settings.autoCleanOnThemeChange && this.settings.enabled && this.cssEnhanceEnabled) {
      console.log('[CssEnhanceModule] 执行主题切换清理...');

      // 1. 彻底清理所有扩展创建的内容
      this.cleanupEnhancedElements();

      // 2. 重置处理记录
      this.lastProcessedContent = null;
      this.currentTextarea = null;
      this.appliedStyleId = null;

      // 3. 延迟后重新查找并监听新的textarea
      setTimeout(() => {
        this.watchCustomCSSTextarea();
      }, 300);
    }
  }

  /**
   * 清理增强元素（更彻底的清理）
   */
  cleanupEnhancedElements() {
    // 1. 清理所有带enhanced标记的样式
    document.querySelectorAll('style[id*="enhanced"], style[data-enhanced-css], style[data-style-id*="enhanced"]').forEach(el => {
      try {
        el.remove();
        console.log('[CssEnhanceModule] 移除样式:', el.id);
      } catch (e) {
        console.warn('[CssEnhanceModule] 清理样式失败:', e);
      }
    });

    // 2. 清理所有带扩展标记的元素
    document.querySelectorAll('[data-enhanced-css-element], [data-enhanced-css-id], [class*="enhanced-add-"]').forEach(el => {
      try {
        el.remove();
      } catch (e) {
        console.warn('[CssEnhanceModule] 清理元素失败:', e);
      }
    });

    // 3. 使用核心引擎的清理功能
    if (this.coreEngine) {
      this.coreEngine.clearAll();
    }

    console.log('[CssEnhanceModule] 主题切换清理完成');
  }

  /**
   * 深度清理（处理主题切换残留）
   */
  deepCleanup() {
    this.cleanupEnhancedElements();
  }

  /**
   * 启用模块（扩展级别的启用）
   */
  enable() {
    this.settings.enabled = true;
    this.saveSettings();

    // 重新应用当前CSS（同时检查CSS增强功能是否启用）
    if (this.cssEnhanceEnabled && this.currentTextarea && this.currentTextarea.value) {
      this.lastProcessedContent = null;
      this.handleCSSChange(this.currentTextarea.value);
    }
  }

  /**
   * 禁用模块（扩展级别的禁用）
   */
  disable() {
    this.settings.enabled = false;
    this.saveSettings();

    // 清理所有添加的内容
    this.cleanupEnhancedElements();
  }

  /**
   * 清理模块
   */
  cleanup() {
    // 移除事件监听器
    if (this.currentTextarea && this.textareaHandler) {
      this.currentTextarea.removeEventListener('input', this.textareaHandler);
    }

    // 断开观察器
    if (this.textareaObserver) {
      this.textareaObserver.disconnect();
    }

    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }

    // 清理所有添加的内容
    this.cleanupEnhancedElements();
  }

  /**
   * 销毁模块
   */
  destroy() {
    this.cleanup();

    // 销毁UI
    if (this.ui) {
      this.ui.destroy();
    }
  }

  /**
   * 获取标签页配置
   */
  getTabConfig() {
    return {
      id: this.moduleId,
      title: 'CSS增强',
      icon: 'fa-code',
      ui: CssEnhanceUI,
      order: 1
    };
  }

  /**
   * 获取模块统计信息
   */
  getStats() {
    return {
      currentContent: this.currentCSSContent ? this.currentCSSContent.length : 0,
      engineStats: this.coreEngine.getStats(),
      enabled: this.cssEnhanceEnabled
    };
  }

  /**
   * 手动触发CSS处理
   */
  processCSS(content) {
    // 检查功能是否启用
    if (!this.cssEnhanceEnabled) {
      console.warn('[CssEnhanceModule] CSS增强功能已禁用');
      return null;
    }
    return this.processor.process(content);
  }

  /**
   * 清除所有CSS增强内容（手动清理）
   */
  clearAll() {
    this.cleanupEnhancedElements();
    this.lastProcessedContent = null;

    // 通知UI刷新
    this.eventBus.emit('css:cleared');
  }

  /**
   * 防抖函数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}