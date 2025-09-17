/**
 * Enhanced Custom CSS Plus - 扩展主入口
 * 
 * 核心功能：
 * - SillyTavern扩展系统初始化和生命周期管理
 * - 协调四大功能模块：可视化编辑器、字体管理、CSS增强、标签页管理
 * - 提供统一的存储接口和EventBus通信机制
 * - 扩展设置页面集成和API接口暴露
 */

// 导入核心模块
import { CoreStorage } from './core-storage.js';
import { EventBus } from './core-events.js';
import { CoreEngine } from './core-engine.js';

// 导入功能模块
import { CssEnhanceModule } from './css-enhance-main.js';
import { FontManagerModule } from './font-manager-main.js';
import { VisualEditorMain } from './visual-editor-main.js';

// 导入UI管理器
import { TabManager } from './ui-tab-manager.js';

// ========== 主扩展类 ==========
class EnhancedCustomCSSPlus {
  constructor() {
    this.extensionName = 'EnhancedCustomCSSPlus';
    this.version = '2.0.3';

    console.log(`[${this.extensionName}] 构造函数执行，版本 ${this.version}`);

    // 初始化核心服务
    this.storage = new CoreStorage(this.extensionName);
    this.eventBus = new EventBus();
    this.coreEngine = new CoreEngine(this.storage, this.eventBus);

    // 初始化模块容器
    this.modules = new Map();

    // 初始化UI管理器
    this.tabManager = new TabManager(this);

    // 全局设置
    this.settings = {
      enabled: true,
      realTimeUpdate: true,
      debugMode: false
    };

    // 标记初始化状态
    this.initialized = false;
  }

  /**
   * 初始化扩展
   */
  async init() {
    console.log(`[${this.extensionName}] 开始初始化...`);

    try {
      // 1. 加载设置
      await this.loadSettings();

      // 2. 初始化核心引擎
      await this.coreEngine.init();

      // 3. 初始化标签页管理器
      await this.tabManager.init();

      // 4. 初始化功能模块
      await this.initModules();

      // 5. 设置事件监听
      this.setupEventListeners();

      // 6. 暴露全局API
      this.exposeAPI();

      // 7. 标记初始化完成
      this.initialized = true;

      console.log(`[${this.extensionName}] ✅ 初始化完成！`);

      // 显示成功提示
      this.showToast('Enhanced CSS Plus 加载成功', 'success');

    } catch (error) {
      console.error(`[${this.extensionName}] ❌ 初始化失败:`, error);
      this.showToast('Enhanced CSS Plus 加载失败', 'error');
    }
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    const saved = await this.storage.get('globalSettings');
    if (saved) {
      this.settings = { ...this.settings, ...saved };
    }
    console.log(`[${this.extensionName}] 设置已加载:`, this.settings);
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    await this.storage.set('globalSettings', this.settings);
  }

  /**
   * 初始化功能模块
   */
  async initModules() {
    console.log(`[${this.extensionName}] 初始化功能模块...`);

    // 1. CSS增强模块
    const cssEnhanceModule = new CssEnhanceModule(this);
    await cssEnhanceModule.init();
    this.modules.set('css-enhance', cssEnhanceModule);

    // 2. 字体管理模块
    const fontManagerModule = new FontManagerModule(this);
    await fontManagerModule.init();
    this.modules.set('font-manager', fontManagerModule);

    // 3. 可视化编辑器模块
    const visualEditor = new VisualEditorMain(this);
    await visualEditor.init();
    this.modules.set('visual-editor', visualEditor);

    // 4. 注册模块到标签页
    this.modules.forEach(module => {
      if (module.getTabConfig) {
        const tabConfig = module.getTabConfig();
        this.tabManager.registerTab(tabConfig);
      }
    });

    console.log(`[${this.extensionName}] 已初始化 ${this.modules.size} 个模块`);
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 扩展启用/禁用
    this.eventBus.on('extension:toggle', async (enabled) => {
      this.settings.enabled = enabled;
      await this.saveSettings();

      if (!enabled) {
        this.disable();
      } else {
        this.enable();
      }
    });

    // 设置变化
    this.eventBus.on('settings:changed', async (changes) => {
      Object.assign(this.settings, changes);
      await this.saveSettings();
    });

    // 调试模式
    this.eventBus.on('debug:toggle', (enabled) => {
      this.settings.debugMode = enabled;
      this.eventBus.debugMode = enabled;
      this.coreEngine.setDebugMode(enabled);
    });

    // 监听页面主题变化
    this.watchThemeChanges();

    console.log(`[${this.extensionName}] 事件监听器已设置`);
  }

  /**
   * 监听主题变化
   */
  watchThemeChanges() {
    // 监听主题切换按钮点击
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme') {
          console.log(`[${this.extensionName}] 检测到主题变化`);
          this.onThemeChange();
        }
      });
    });

    // 监听body的data-theme属性变化
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }

    // 监听主题模式按钮点击
    document.addEventListener('click', (e) => {
      if (e.target.closest('#themes_list button') ||
        e.target.closest('.theme-toggle')) {
        setTimeout(() => this.onThemeChange(), 100);
      }
    });
  }

  /**
   * 处理主题变化
   */
  onThemeChange() {
    // 通知CSS增强模块
    const cssModule = this.modules.get('css-enhance');
    if (cssModule && cssModule.onThemeChange) {
      cssModule.onThemeChange();
    }

    // 发布主题变化事件
    this.eventBus.emit('theme:changed');
  }

  /**
   * 启用扩展
   */
  enable() {
    this.settings.enabled = true;

    // 启用所有模块
    this.modules.forEach(module => {
      if (module.enable) {
        module.enable();
      }
    });

    console.log(`[${this.extensionName}] 扩展已启用`);
  }

  /**
   * 禁用扩展
   */
  disable() {
    this.settings.enabled = false;

    // 禁用所有模块
    this.modules.forEach(module => {
      if (module.disable) {
        module.disable();
      }
    });

    // 清理引擎内容
    this.coreEngine.clearAll();

    console.log(`[${this.extensionName}] 扩展已禁用`);
  }

  /**
   * 获取模块
   */
  getModule(moduleId) {
    return this.modules.get(moduleId);
  }

  /**
   * 暴露全局API
   */
  exposeAPI() {
    window.EnhancedCSS = {
      // 核心功能
      addCSS: (css, id) => this.coreEngine.applyCSS(css, id),
      addClass: (selector, className) => this.coreEngine.addClass(selector, className),
      addElement: (parent, tag, options) => this.coreEngine.addElement(parent, tag, options),
      executeScript: (code) => this.coreEngine.executeScript(code),
      clear: () => this.coreEngine.clearAll(),

      // 模块访问
      getModule: (moduleId) => this.getModule(moduleId),

      // 获取字体列表
      getFonts: () => {
        const fontModule = this.modules.get('font-manager');
        return fontModule ? Array.from(fontModule.fonts.values()) : [];
      },

      // 获取设置
      getSettings: () => this.settings,

      // 实用工具
      $: (selector) => document.querySelector(selector),
      $$: (selector) => document.querySelectorAll(selector),

      // 调试功能
      debug: () => {
        console.log('=== Enhanced CSS Plus 调试信息 ===');
        console.log('版本:', this.version);
        console.log('设置:', this.settings);
        console.log('模块:', Array.from(this.modules.keys()));
        console.log('引擎统计:', this.coreEngine.getStats());

        // 各模块统计
        this.modules.forEach((module, id) => {
          if (module.getStats) {
            console.log(`模块 [${id}]:`, module.getStats());
          }
        });
      },

      // 获取版本
      version: this.version,

      // 重置功能（供调试使用）
      reset: async () => {
        if (confirm('确定要重置扩展吗？这将清除所有数据。')) {
          await this.storage.clear();
          this.coreEngine.clearAll();
          location.reload();
        }
      }
    };

    console.log(`[${this.extensionName}] API已暴露到 window.EnhancedCSS`);
  }

  /**
   * 显示提示消息
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      color: white;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      background: ${type === 'success' ? '#4CAF50' :
        type === 'error' ? '#f44336' :
          '#2196F3'
      };
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 添加动画样式（如果还没有）
    if (!document.getElementById('enhanced-css-animations')) {
      const style = document.createElement('style');
      style.id = 'enhanced-css-animations';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// ========== 启动扩展 ==========
// 使用jQuery确保DOM就绪
jQuery(async () => {
  'use strict';

  console.log('[EnhancedCustomCSSPlus] 开始加载扩展（模块化版本）...');

  try {
    // 检查SillyTavern环境
    if (typeof extension_settings === 'undefined') {
      console.warn('[EnhancedCustomCSSPlus] 警告：未检测到SillyTavern环境');
    }

    // 创建并初始化扩展实例
    const extension = new EnhancedCustomCSSPlus();

    // 保存到全局变量（用于调试）
    window.EnhancedCustomCSSPlus = extension;

    // 等待一小段时间确保SillyTavern完全加载
    setTimeout(async () => {
      try {
        await extension.init();
      } catch (error) {
        console.error('[EnhancedCustomCSSPlus] 延迟初始化失败:', error);
      }
    }, 500);

  } catch (error) {
    console.error('[EnhancedCustomCSSPlus] 启动失败:', error);
  }
});