/**
 * CSS增强UI模块 - 管理CSS增强功能的界面
 * 功能：CSS增强标签页的UI渲染和交互
 * 
 * 修改记录：
 * - 2025-09-06: 从ui.js分离为独立模块
 * - 2025-09-06: 修复标签页空白问题
 * - 2025-09-06: 添加CSS增强功能开关
 */

import { UIBase } from './ui-base.js';

export class CssEnhanceUI extends UIBase {
  constructor(module) {
    super(module);

    // UI状态
    this.uiState = {
      showHelp: true
    };
  }

  /**
   * 渲染UI（修复版：不强制设置display）
   */
  render() {
    if (!this.container) {
      console.warn('[CssEnhanceUI] 容器不存在，跳过渲染');
      return;
    }

    this.container.innerHTML = `
      <div class="enhanced-section css-enhance-section">
        <!-- CSS增强功能开关 -->
        <div class="css-enhance-enable-section-compact">
          <label class="checkbox_label">
            <input type="checkbox" id="css-enhance-enabled" ${this.module.cssEnhanceEnabled ? 'checked' : ''}>
            <span>启用CSS增强功能</span>
            <span class="hint-inline">关闭后将暂停CSS处理，但保留已应用的内容</span>
          </label>
        </div>

        ${!this.module.cssEnhanceEnabled ? `
          <div class="css-enhance-disabled-notice">
            <i class="fa fa-info-circle"></i>
            <span>CSS增强功能已禁用。启用后将开始处理CSS内容中的增强语法和JavaScript代码。</span>
          </div>
        ` : ''}
        
        <div class="section-header">
          <h4>CSS增强功能</h4>
          <div class="section-controls">
            <button class="mini-btn" id="css-clear-all" title="清除所有增强内容">
              <i class="fa fa-broom"></i> 清除
            </button>
          </div>
        </div>
        
        <div class="help-toggle">
          <label class="checkbox_label">
            <input type="checkbox" id="show-help" ${this.uiState.showHelp ? 'checked' : ''}>
            <span>显示使用说明</span>
          </label>
        </div>
        
        <div class="enhanced-help-content" id="help-content" style="${this.uiState.showHelp ? '' : 'display: none;'}">
          <div class="help-section">
            <strong>@add 增强语法：</strong>
            <pre class="code-block">
.selector {
  @add: className "内容" top-10px left-20px;
  @add: image "url(图片)" 100x100 bottom-0 right-0;
}</pre>
          </div>
          
          <div class="help-section">
            <strong>JavaScript 功能：</strong>
            <pre class="code-block">
&lt;script&gt;
// 使用 EnhancedCSS API
EnhancedCSS.addElement('.selector', 'div', {
  class: 'decoration',
  html: '内容',
  style: { position: 'absolute' }
});
&lt;/script&gt;</pre>
          </div>
          
          <div class="help-section">
            <strong>可用API：</strong>
            <ul class="api-list">
              <li><code>EnhancedCSS.addClass(selector, className)</code> - 添加类名</li>
              <li><code>EnhancedCSS.addElement(parent, tag, options)</code> - 添加元素</li>
              <li><code>EnhancedCSS.addCSS(css)</code> - 添加CSS样式</li>
              <li><code>EnhancedCSS.$(selector)</code> - 查询单个元素</li>
              <li><code>EnhancedCSS.$$(selector)</code> - 查询多个元素</li>
            </ul>
          </div>
        </div>
        
        <!-- 性能监控 -->
        <div class="stats-section">
          <h5>性能监控</h5>
          <div id="css-enhance-stats" class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">添加的元素</span>
              <span class="stat-value" id="stat-elements">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">添加的样式</span>
              <span class="stat-value" id="stat-styles">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">修改的类名</span>
              <span class="stat-value" id="stat-classes">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">CSS内容大小</span>
              <span class="stat-value" id="stat-size">0 B</span>
            </div>
          </div>
        </div>
      </div>
    `;

    console.log('[CssEnhanceUI] UI渲染完成');
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // CSS增强功能启用开关
    const cssEnhanceEnabledCheckbox = this.$('#css-enhance-enabled');
    if (cssEnhanceEnabledCheckbox) {
      this.addEventListener(cssEnhanceEnabledCheckbox, 'change', async (e) => {
        await this.module.setCssEnhanceEnabled(e.target.checked);
        // 刷新UI以更新禁用提示
        this.render();
        this.bindEvents();
      });
    }

    // 显示/隐藏帮助
    const showHelpCheckbox = this.$('#show-help');
    if (showHelpCheckbox) {
      this.addEventListener(showHelpCheckbox, 'change', (e) => {
        this.uiState.showHelp = e.target.checked;
        const helpContent = this.$('#help-content');
        if (helpContent) {
          helpContent.style.display = this.uiState.showHelp ? 'block' : 'none';
        }
      });
    }

    // 清除所有按钮
    const clearBtn = this.$('#css-clear-all');
    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => {
        if (this.confirm('确定要清除所有CSS增强内容吗？')) {
          this.module.clearAll();
          this.showMessage('已清除所有CSS增强内容', 'success');
          this.updateStats();
        }
      });
    }

    // 监听统计更新事件
    this.module.eventBus.on('css:processed', () => this.updateStats());
    this.module.eventBus.on('css:cleared', () => this.updateStats());
    this.module.eventBus.on('cssEnhance:enabledChanged', (enabled) => {
      // 当状态变化时更新UI
      const checkbox = this.$('#css-enhance-enabled');
      if (checkbox) {
        checkbox.checked = enabled;
      }
    });

    // 初始更新统计
    this.updateStats();

    // 定期更新统计
    this.statsInterval = setInterval(() => this.updateStats(), 5000);
  }

  /**
   * 初始化UI（修复版：不强制设置display）
   */
  async init(container) {
    this.container = container;

    // 渲染UI
    this.render();

    // 绑定事件
    this.bindEvents();

    // 初始化完成
    this.initialized = true;

    console.log('[CssEnhanceUI] 初始化完成');
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    if (!this.module || !this.module.getStats) {
      return;
    }

    const stats = this.module.getStats();
    const engineStats = stats.engineStats || {};

    // 更新元素数量
    const elementsEl = this.$('#stat-elements');
    if (elementsEl) {
      elementsEl.textContent = engineStats.elements || 0;
    }

    // 更新样式数量
    const stylesEl = this.$('#stat-styles');
    if (stylesEl) {
      stylesEl.textContent = engineStats.styles || 0;
    }

    // 更新类名数量
    const classesEl = this.$('#stat-classes');
    if (classesEl) {
      classesEl.textContent = engineStats.classes || 0;
    }

    // 更新内容大小
    const sizeEl = this.$('#stat-size');
    if (sizeEl) {
      const size = stats.currentContent || 0;
      sizeEl.textContent = this.formatSize(size);
    }
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 刷新UI
   */
  refresh() {
    // 确保容器存在
    if (!this.container) {
      console.warn('[CssEnhanceUI] 刷新时容器不存在');
      return;
    }

    this.updateStats();
  }

  /**
   * 销毁UI
   */
  onDestroy() {
    // 清理定时器
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // 清理事件监听器
    this.cleanupListeners();
  }
}