/**
 * 标签页管理器 - 设置界面导航系统
 * 
 * 核心功能：
 * - 动态注册和管理扩展标签页（可视化编辑器、字体管理等）
 * - 标签页切换逻辑和活动状态管理
 * - 提供全局设置：重置配置、主题跟随等
 * - 统一的设置界面渲染和事件处理
 */

export class TabManager {
  constructor(extension) {
    this.extension = extension;
    this.tabs = new Map();
    this.currentTab = null;
    this.container = null;
  }

  /**
   * 初始化标签页管理器
   */
  async init() {
    // 等待扩展面板加载
    await this.waitForExtensionPanel();

    // 创建主容器
    this.createContainer();

    // 初始化基础UI结构
    this.createBaseStructure();

    // 应用标签页显示修复
    this.ensureTabVisibility();

    console.log('[TabManager] 标签页管理器初始化完成');
  }

  /**
   * 等待扩展面板出现
   */
  waitForExtensionPanel() {
    return new Promise((resolve) => {
      const checkPanel = setInterval(() => {
        const extensionsPanel = document.querySelector('#extensions_settings');
        if (extensionsPanel) {
          clearInterval(checkPanel);
          resolve(extensionsPanel);
        }
      }, 100);

      // 10秒超时
      setTimeout(() => clearInterval(checkPanel), 10000);
    });
  }

  /**
   * 创建主容器
   */
  createContainer() {
    const extensionsPanel = document.querySelector('#extensions_settings');
    if (!extensionsPanel) return;

    // 检查是否已创建
    if (document.querySelector('#EnhancedCustomCSSPlus_settings')) {
      this.container = document.querySelector('#EnhancedCustomCSSPlus_settings');
      return;
    }

    // 创建新容器
    const container = document.createElement('div');
    container.id = 'EnhancedCustomCSSPlus_settings';
    container.className = 'extension_settings';

    extensionsPanel.appendChild(container);
    this.container = container;
  }

  /**
   * 创建基础UI结构
   */
  createBaseStructure() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
          <b>˚₊·⸅ 毛球点心铺 ⸅·₊˚</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <!-- 顶部控制栏 -->
          <div class="enhanced-top-controls">
            <div class="flex-container">
              <label class="checkbox_label">
                <input type="checkbox" id="enhanced-enabled" checked>
                <span>启用扩展</span>
              </label>
              <label class="checkbox_label">
                <input type="checkbox" id="enhanced-realtime" checked>
                <span>实时更新</span>
              </label>
              <label class="checkbox_label">
                <input type="checkbox" id="enhanced-debug">
                <span>调试模式</span>
              </label>
            </div>
          </div>
          
          <!-- 标签页导航 -->
          <div class="enhanced-tabs-nav" id="enhanced-tabs-nav">
            <!-- 动态生成标签页按钮 -->
          </div>
          
          <!-- 标签页内容区域 -->
          <div class="enhanced-tabs-content" id="enhanced-tabs-content">
            <!-- 动态生成标签页内容 -->
          </div>
        </div>
      </div>
    `;

    // 绑定基础事件
    this.bindBaseEvents();
  }

  /**
   * 确保标签页显示正确
   * 添加必要的CSS规则，确保只有活动标签页显示
   */
  ensureTabVisibility() {
    // 检查是否已经添加了修复样式
    const existingStyle = document.getElementById('enhanced-css-tab-fix');
    if (existingStyle) {
      existingStyle.remove();
    }

    // 添加修复样式
    const style = document.createElement('style');
    style.id = 'enhanced-css-tab-fix';
    style.textContent = `
      /* 标签页显示修复 - 确保只有活动标签页显示 */
      .enhanced-tabs-content > .tab-content {
        display: none !important;
      }
      
      .enhanced-tabs-content > .tab-content.active {
        display: block !important;
      }
      
      /* 防止子元素影响标签页显示 */
      .enhanced-tabs-content > .tab-content > * {
        /* 子元素不应该影响父容器的display */
      }
      
      /* 确保标签按钮样式正确 */
      .enhanced-tabs-nav .tab-button {
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .enhanced-tabs-nav .tab-button.active {
        background: var(--SmartThemeQuoteColor);
        color: white;
      }
    `;

    document.head.appendChild(style);
    console.log('[TabManager] 标签页显示修复样式已应用');
  }

  /**
   * 绑定基础事件
   */
  bindBaseEvents() {
    // 扩展启用开关
    const enabledCheckbox = document.getElementById('enhanced-enabled');
    if (enabledCheckbox) {
      enabledCheckbox.checked = this.extension.settings.enabled;
      enabledCheckbox.addEventListener('change', (e) => {
        this.extension.eventBus.emit('extension:toggle', e.target.checked);
      });
    }

    // 实时更新开关
    const realtimeCheckbox = document.getElementById('enhanced-realtime');
    if (realtimeCheckbox) {
      realtimeCheckbox.checked = this.extension.settings.realTimeUpdate;
      realtimeCheckbox.addEventListener('change', (e) => {
        this.extension.eventBus.emit('settings:changed', {
          realTimeUpdate: e.target.checked
        });
      });
    }

    // 调试模式开关
    const debugCheckbox = document.getElementById('enhanced-debug');
    if (debugCheckbox) {
      debugCheckbox.checked = this.extension.settings.debugMode;
      debugCheckbox.addEventListener('change', (e) => {
        this.extension.eventBus.emit('settings:changed', {
          debugMode: e.target.checked
        });
        this.extension.eventBus.emit('debug:toggle', e.target.checked);
      });
    }
  }

  /**
   * 注册标签页
   * @param {Object} config - 标签页配置
   */
  registerTab(config) {
    const { id, title, icon, ui, order = 999 } = config;

    // 保存标签页配置
    this.tabs.set(id, {
      id,
      title,
      icon,
      ui,
      order,
      instance: null
    });

    // 更新UI
    this.updateTabsUI();

    console.log(`[TabManager] 注册标签页: ${id}`);
  }

  /**
   * 更新标签页UI
   */
  updateTabsUI() {
    const navContainer = document.getElementById('enhanced-tabs-nav');
    const contentContainer = document.getElementById('enhanced-tabs-content');

    if (!navContainer || !contentContainer) return;

    // 按order排序
    const sortedTabs = Array.from(this.tabs.values()).sort((a, b) => a.order - b.order);

    // 清空现有内容
    navContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    // 添加关于标签页
    sortedTabs.push({
      id: 'about',
      title: '关于',
      icon: 'fa-info-circle',
      order: 9999
    });

    // 创建标签页按钮和内容区域
    sortedTabs.forEach((tab, index) => {
      // 创建按钮
      const button = document.createElement('button');
      button.className = index === 0 ? 'tab-button active' : 'tab-button';
      button.dataset.tab = tab.id;
      button.innerHTML = `<i class="fa ${tab.icon}"></i> ${tab.title}`;
      navContainer.appendChild(button);

      // 创建内容区域
      const content = document.createElement('div');
      content.className = index === 0 ? 'tab-content active' : 'tab-content';
      content.id = `tab-${tab.id}`;

      // 明确设置初始显示状态
      content.style.display = index === 0 ? 'block' : 'none';

      // 特殊处理关于页面
      if (tab.id === 'about') {
        content.innerHTML = this.createAboutContent();
      }

      contentContainer.appendChild(content);

      // 只激活第一个标签页
      if (index === 0) {
        this.currentTab = tab.id;
        // 延迟激活标签页，确保模块已初始化
        setTimeout(() => this.activateTab(tab.id), 100);
      }
    });

    // 绑定标签页切换事件
    this.bindTabEvents();

    // 重新应用修复，确保新创建的标签页也正确显示
    this.ensureTabVisibility();
  }

  /**
   * 创建关于页面内容
   */
  createAboutContent() {
    return `
      <div class="enhanced-section">
        <h4><i class="fa fa-info-circle"></i> 关于 毛球点心铺</h4>
        
        <div class="about-content">
          <p><strong>版本：</strong> 2.0.3</p>
          <p><strong>作者：</strong> 山光＆潭影 </p>
          <p><strong>扩展名：</strong> 和小伙伴@我叫丁春秋 一起取名</p>
          <p><strong>说明：</strong> 两人需求的自用产物，暂无公开意向</p>
          <p><strong>功能：</strong></p>
          <ul>
            <li>» JavaScript代码执行</li>
            <li>» 动态DOM元素添加</li>
            <li>» @add增强语法</li>
            <li>» 字体管理系统</li>
            <li>» 导入/导出配置</li>
          </ul>
          <p><strong>₍ ˄. ̫.˄₎⟆：</strong></p>
          <ul>
            <li>» @我叫丁春秋 为我大量测试，云端酒馆和各种操作问题，爱她。</li>
          </ul>
          
          <div class="about-actions">
            <a href="https://github.com/Hmkovo/EnhancedCustomCSS" target="_blank" class="menu_button">
              <i class="fab fa-github"></i> GitHub
            </a>
            <button id="reset-all-settings" class="menu_button danger">
              <i class="fa fa-undo"></i> 重置所有设置
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 绑定标签页事件
   */
  bindTabEvents() {
    // 标签页切换
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.tab;
        this.switchTab(tabId);
      });
    });

    // 重置所有设置按钮
    const resetBtn = document.getElementById('reset-all-settings');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('确定要重置所有设置吗？这将清除所有数据（包括字体、CSS设置等）。')) {
          // 清空所有存储数据
          await this.extension.storage.clear();

          // 清理所有DOM元素和样式
          this.extension.coreEngine.clearAll();

          // 如果有CSS增强模块，执行深度清理
          const cssModule = this.extension.modules.get('css-enhance');
          if (cssModule && cssModule.deepCleanup) {
            cssModule.deepCleanup();
          }

          alert('所有设置已重置，页面将刷新以应用更改。');
          location.reload();
        }
      });
    }
  }

  /**
   * 切换标签页（修复版）
   */
  switchTab(tabId) {
    // 更新按钮状态
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // 更新内容显示 - 使用更明确的方式
    const tabsContent = document.querySelector('.enhanced-tabs-content');
    if (!tabsContent) return;

    // 隐藏所有标签页
    const allTabs = tabsContent.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
      // 强制设置display为none
      tab.style.display = 'none';
    });

    // 显示目标标签页
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) {
      targetTab.classList.add('active');
      // 强制设置display为block
      targetTab.style.display = 'block';
    }

    // 记录当前标签页
    this.currentTab = tabId;

    // 激活标签页（初始化UI实例）
    this.activateTab(tabId);

    // 发布标签页切换事件
    this.extension.eventBus.emit('tab:switched', tabId);

    console.log(`[TabManager] 切换到标签页: ${tabId}`);
  }

  /**
   * 激活标签页（修复版：不要修改display）
   */
  activateTab(tabId) {
    const tab = this.tabs.get(tabId);

    // 如果是关于页面，直接返回
    if (tabId === 'about') {
      return;
    }

    if (!tab || !tab.ui) {
      console.warn(`[TabManager] 标签页配置不存在或没有UI: ${tabId}`);
      return;
    }

    const container = document.getElementById(`tab-${tabId}`);
    if (!container) {
      console.warn(`[TabManager] 标签页容器不存在: tab-${tabId}`);
      return;
    }

    // 如果还没有实例化，创建实例
    if (!tab.instance) {
      // 获取对应的模块
      const module = this.extension.getModule(tabId);

      if (!module) {
        console.warn(`[TabManager] 模块还未初始化: ${tabId}，延迟激活`);
        // 延迟重试
        setTimeout(() => this.activateTab(tabId), 500);
        return;
      }

      try {
        tab.instance = new tab.ui(module);
        tab.instance.init(container);
        console.log(`[TabManager] 标签页UI初始化成功: ${tabId}`);
      } catch (error) {
        console.error(`[TabManager] 标签页UI初始化失败: ${tabId}`, error);
        return;
      }
    }

    // 刷新UI（只在当前标签页是激活状态时才刷新）
    if (tab.instance && tab.instance.refresh && this.currentTab === tabId) {
      try {
        tab.instance.refresh();
      } catch (error) {
        console.error(`[TabManager] 标签页刷新失败: ${tabId}`, error);
      }
    }
  }

  /**
   * 获取当前标签页
   */
  getCurrentTab() {
    return this.currentTab;
  }

  /**
   * 销毁标签页管理器
   */
  destroy() {
    // 销毁所有标签页实例
    this.tabs.forEach(tab => {
      if (tab.instance && tab.instance.destroy) {
        tab.instance.destroy();
      }
    });

    // 清空容器
    if (this.container) {
      this.container.remove();
    }

    // 清理数据
    this.tabs.clear();
    this.currentTab = null;
    this.container = null;
  }
}