/**
 * 可视化CSS编辑器 - UI渲染引擎
 * 
 * 核心功能：
 * - 渲染内嵌编辑面板界面（元素列表、属性面板、图标组）
 * - 管理标签页切换和交互事件绑定
 * - 提供撤销/重做、重置等操作界面
 * - 智能@装饰语法管理器状态指示器UI
 */

export class VisualEditorUI {
  constructor(module, registry, panelsFactory) {
    this.module = module;
    this.registry = registry;
    this.panelsFactory = panelsFactory;
    this.container = null;

    // UI状态
    this.currentTab = 'elements';
    this.selectedElement = null;
    this.activeCategory = 'all';
    this.searchKeyword = '';

    // 事件监听器清理
    this.eventListeners = [];
  }

  /**
   * 初始化UI
   */
  init(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  /**
   * 渲染UI（增强版，显示图标组信息）
   */
  render() {
    if (!this.container) return;

    // 获取分类
    const categories = this.registry.getCategories();

    // 计算待应用的规则数
    const pendingCount = this.module.pendingStyles.size;
    const hasChanges = this.checkHasChanges();

    // 获取图标组统计（新增）
    const iconGroups = this.registry.iconGroups || {};
    const hasIconGroups = Object.keys(iconGroups).length > 0;

    this.container.innerHTML = `
      <div class="ve-inline-container">
        <!-- 🆕 智能@装饰语法管理器状态指示器（静态定义） -->
        <div class="decoration-smart-status" id="decoration-smart-status">
          <div class="decoration-status-row">
            <div class="decoration-status-info">
              <i class="fa fa-circle text-muted" id="smart-mode-indicator"></i>
              <small id="smart-mode-text">装饰管理待机</small>
            </div>
            <button id="refresh-decorations" class="menu_button compact" title="手动刷新装饰">
              <i class="fa fa-magic"></i> 刷新装饰
            </button>
          </div>
        </div>
        
        <!-- 顶部工具栏 -->
        <div class="ve-toolbar">
          <div class="ve-toolbar-left">
            <button class="ve-tab-btn ${this.currentTab === 'elements' ? 'active' : ''}" data-tab="elements">
              <i class="fa fa-mouse-pointer"></i> 元素编辑
            </button>
            <button class="ve-tab-btn ${this.currentTab === 'templates' ? 'active' : ''}" data-tab="templates">
              <i class="fa fa-magic"></i> 快速模板
            </button>
            ${hasIconGroups ? `
              <button class="ve-tab-btn ${this.currentTab === 'icons' ? 'active' : ''}" data-tab="icons">
                <i class="fa fa-icons"></i> 图标组
              </button>
            ` : ''}
            
            <div class="ve-info-display">
              <span class="ve-info-text">
                <i class="fa fa-magic"></i> 原生实时预览已启用
              </span>
            </div>
          </div>
          
          <div class="ve-toolbar-right">
            <button id="ve-undo" class="ve-btn" title="撤销" ${this.module.historyIndex <= 0 ? 'disabled' : ''}>
              <i class="fa fa-undo"></i>
            </button>
            <button id="ve-redo" class="ve-btn" title="重做" ${this.module.historyIndex >= this.module.editHistory.length - 1 ? 'disabled' : ''}>
              <i class="fa fa-redo"></i>
            </button>
            <span class="ve-separator"></span>
            
            <button id="ve-reset" class="ve-btn" title="重置当前编辑">
              <i class="fa fa-refresh"></i> 重置
            </button>
            
            <!-- 信息显示 -->
            ${hasChanges ? `
              <span class="ve-changes-info">
                <i class="fa fa-magic"></i> ${pendingCount} 项修改已自动应用到CSS
              </span>
            ` : `
              <span class="ve-changes-info">
                <i class="fa fa-check-circle"></i> 所有修改会立即生效
              </span>
            `}
          </div>
        </div>
        
        <!-- 内容区域 -->
        <div class="ve-content">
          <!-- 元素编辑标签页 -->
          <div class="ve-tab-panel ${this.currentTab === 'elements' ? 'active' : ''}" data-panel="elements">
            <div class="ve-elements-layout">
              <!-- 左侧：元素列表 -->
              <div class="ve-elements-sidebar">
                <div class="ve-search-bar">
                  <input type="text" 
                         id="ve-element-search" 
                         class="ve-search-input" 
                         placeholder="搜索元素..."
                         value="${this.searchKeyword}">
                </div>
                <div class="ve-filter-bar">
                  <select id="ve-category-filter" class="ve-select">
                    <option value="all">所有类别 (${this.registry.getAllElements().length})</option>
                    ${categories.map(cat => {
      const count = this.registry.getElementsByCategory(cat).length;
      return `<option value="${cat}">${this.getCategoryLabel(cat)} (${count})</option>`;
    }).join('')}
                  </select>
                </div>
                <div class="ve-element-list">
                  ${this.renderElementList()}
                </div>
              </div>
              
              <!-- 右侧：属性编辑 -->
              <div class="ve-properties-panel" id="ve-properties-container">
                ${this.selectedElement ?
        this.panelsFactory.generateElementPanel(this.selectedElement) :
        this.renderNoSelection()}
              </div>
            </div>
          </div>
          
          <!-- 快速模板标签页 -->
          <div class="ve-tab-panel ${this.currentTab === 'templates' ? 'active' : ''}" data-panel="templates">
            <div class="ve-templates-container">
              ${this.renderTemplates()}
            </div>
          </div>
          
          <!-- 图标组标签页（新增） -->
          ${hasIconGroups ? `
            <div class="ve-tab-panel ${this.currentTab === 'icons' ? 'active' : ''}" data-panel="icons">
              <div class="ve-icons-container">
                ${this.renderIconGroups()}
              </div>
            </div>
          ` : ''}
        </div>
        
        <!-- 状态栏 -->
        <div class="ve-statusbar">
          <div class="ve-status-left">
            <span id="ve-status-text">
              原生实时预览模式 - 修改会立即生效
            </span>
          </div>
          <div class="ve-status-right">
            <span>元素: ${this.registry.getAllElements().length}</span>
            <span>待应用: ${pendingCount}</span>
            <span>已保存: ${this.module.appliedStyles.size}</span>
            ${hasIconGroups ? `<span>图标组: ${Object.keys(iconGroups).length}</span>` : ''}
          </div>
        </div>
      </div>
      
      <!-- 添加内联样式 -->
      <style>
        /* 信息显示样式 */
        .ve-info-display {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 15px;
        }
        
        .ve-info-text {
          font-size: 0.85em;
          color: var(--SmartThemeQuoteColor, #4CAF50);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .ve-changes-info {
          font-size: 0.8em;
          color: var(--SmartThemeBodyColor);
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0.8;
          margin-left: 8px;
        }
        
        /* 按钮样式修复 */
        .ve-btn-warning {
          background: #ff9800 !important;
          color: white !important;
          border-color: #ff9800 !important;
        }
        
        .ve-btn-warning:hover:not(:disabled) {
          background: #f57c00 !important;
        }
        
        .ve-btn-success {
          background: #4CAF50 !important;
          color: white !important;
          border-color: #4CAF50 !important;
        }
        
        .ve-btn-success:hover:not(:disabled) {
          background: #45a049 !important;
        }
        
        /* 搜索栏样式 */
        .ve-search-bar {
          padding: 10px;
          border-bottom: 1px solid var(--SmartThemeBorderColor);
        }
        
        .ve-search-input {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 4px;
          font-size: 13px;
        }
        
        /* 元素列表优化 */
        .ve-element-item {
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }
        
        .ve-element-item:hover {
          background: var(--SmartThemeBlurTintColor);
        }
        
        .ve-element-item.selected {
          background: var(--SmartThemeBlurTintColor);
          border-left-color: #007bff;
        }
        
        .ve-element-item.has-styles {
          font-weight: 500;
        }
        
        .ve-element-name {
          display: block;
          color: var(--SmartThemeBodyTextColor);
          font-size: 13px;
        }
        
        .ve-element-selector {
          display: block;
          color: var(--SmartThemeQuoteColor);
          font-size: 11px;
          font-family: monospace;
          margin-top: 2px;
        }
        
        .ve-element-indicator {
          float: right;
          color: #4CAF50;
        }
        
        /* 图标组标记（新增） */
        .ve-group-badge {
          display: inline-block;
          padding: 1px 4px;
          background: var(--SmartThemeQuoteColor);
          color: white;
          border-radius: 3px;
          font-size: 9px;
          margin-left: 4px;
        }
        
        /* 模板网格 */
        .ve-templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          padding: 15px;
        }
        
        .ve-template-card {
          background: var(--SmartThemeBlurTintColor);
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 8px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .ve-template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .ve-template-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .ve-template-preview {
          font-size: 11px;
          color: var(--SmartThemeQuoteColor);
          max-height: 60px;
          overflow: hidden;
        }
        
        /* 图标组容器样式（新增） */
        .ve-icons-container {
          padding: 15px;
        }
        
        .ve-icon-groups-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .ve-icon-group-card {
          background: var(--SmartThemeBlurTintColor);
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 8px;
          padding: 15px;
        }
        
        .ve-icon-group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .ve-icon-group-name {
          font-weight: bold;
          font-size: 1.1em;
          color: var(--SmartThemeQuoteColor);
        }
        
        .ve-icon-group-count {
          background: var(--SmartThemeQuoteColor);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8em;
        }
        
        .ve-icon-group-description {
          font-size: 0.85em;
          color: var(--SmartThemeBodyColor);
          opacity: 0.8;
          margin-bottom: 10px;
        }
        
        .ve-icon-group-members {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }
        
        .ve-icon-member {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
          font-size: 0.8em;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .ve-icon-member:hover {
          background: var(--SmartThemeQuoteColor);
          color: white;
        }
        
        .ve-icon-member.configured {
          border: 1px solid var(--SmartThemeQuoteColor);
        }
        
        .ve-icon-member i {
          font-size: 1.2em;
        }
        
        .ve-icon-group-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        
        .ve-icon-group-btn {
          flex: 1;
          padding: 6px 10px;
          font-size: 0.85em;
          background: var(--SmartThemeButtonColor);
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .ve-icon-group-btn:hover {
          background: var(--SmartThemeQuoteColor);
          color: white;
        }
        
        /* 分类标签 */
        .ve-category-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 12px;
          font-size: 11px;
          margin-right: 5px;
        }
      </style>
    `;
  }

  /**
   * 渲染元素列表（增强版，显示组信息）
   */
  renderElementList() {
    let elements = this.activeCategory === 'all'
      ? this.registry.getAllElements()
      : this.registry.getElementsByCategory(this.activeCategory);

    // 搜索过滤
    if (this.searchKeyword) {
      elements = elements.filter(el =>
        el.displayName.toLowerCase().includes(this.searchKeyword.toLowerCase()) ||
        el.selector.toLowerCase().includes(this.searchKeyword.toLowerCase())
      );
    }

    if (elements.length === 0) {
      return '<div class="ve-empty-message">没有找到匹配的元素</div>';
    }

    return elements.map(el => {
      const styles = this.module.pendingStyles.get(el.selector);
      const hasStyles = styles && Object.keys(styles).length > 0;
      const isSelected = this.selectedElement === el.selector;

      // 检查是否属于图标组（新增）
      const groupInfo = el.groupId ? this.registry.getIconGroup(el.groupId) : null;

      return `
        <div class="ve-element-item ${isSelected ? 'selected' : ''} ${hasStyles ? 'has-styles' : ''}" 
             data-sel-enc="${encodeURIComponent(el.selector)}">
          <span class="ve-element-name">
            ${el.displayName}
            ${groupInfo ? `<span class="ve-group-badge">${groupInfo.name}</span>` : ''}
          </span>
          <span class="ve-element-selector">${el.selector}</span>
          ${hasStyles ? '<span class="ve-element-indicator">●</span>' : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * 渲染图标组页面（新增）
   */
  renderIconGroups() {
    const iconGroups = this.registry.iconGroups || {};

    if (Object.keys(iconGroups).length === 0) {
      return '<div class="ve-empty-message">没有定义图标组</div>';
    }

    return `
      <div class="ve-icon-groups-grid">
        ${Object.entries(iconGroups).map(([groupId, group]) => {
      const elements = this.registry.getGroupElements(groupId);
      const configuredCount = elements.filter(el => {
        const styles = this.module.pendingStyles.get(el.selector);
        return styles && Object.keys(styles).length > 0;
      }).length;

      return `
            <div class="ve-icon-group-card" data-group="${groupId}">
              <div class="ve-icon-group-header">
                <span class="ve-icon-group-name">${group.name}</span>
                <span class="ve-icon-group-count">${elements.length} 图标</span>
              </div>
              <div class="ve-icon-group-description">${group.description}</div>
              <div class="ve-icon-group-members">
                ${elements.slice(0, 6).map(el => {
        const styles = this.module.pendingStyles.get(el.selector);
        const isConfigured = styles && Object.keys(styles).length > 0;
        return `
                    <div class="ve-icon-member ${isConfigured ? 'configured' : ''}" 
                         data-sel-enc="${encodeURIComponent(el.selector)}"
                         title="${el.displayName}">
                      <i class="fa fa-image"></i>
                      <span>${el.displayName}</span>
                    </div>
                  `;
      }).join('')}
                ${elements.length > 6 ? `
                  <div class="ve-icon-member">
                    <span>+${elements.length - 6} 更多</span>
                  </div>
                ` : ''}
              </div>
              <div class="ve-icon-group-stats">
                <span style="font-size: 0.8em; opacity: 0.8;">
                  已配置: ${configuredCount}/${elements.length}
                </span>
              </div>
              <div class="ve-icon-group-actions">
                <button class="ve-icon-group-btn" data-action="edit-group" data-group="${groupId}">
                  <i class="fa fa-edit"></i> 批量编辑
                </button>
                <button class="ve-icon-group-btn" data-action="clear-group" data-group="${groupId}">
                  <i class="fa fa-eraser"></i> 清除样式
                </button>
              </div>
            </div>
          `;
    }).join('')}
      </div>
      
      <div class="ve-icon-groups-tips">
        <h5>批量操作说明</h5>
        <ul style="font-size: 0.85em; padding-left: 20px;">
          <li>点击"批量编辑"可以统一设置整组图标的样式</li>
          <li>在单个图标编辑页面可以选择批量模式：单独/统一/交替</li>
          <li>交替模式可以为奇偶位置的图标设置不同样式</li>
          <li>子组功能允许分别控制用户和角色的消息按钮</li>
        </ul>
      </div>
    `;
  }

  /**
   * 渲染无选择提示
   */
  renderNoSelection() {
    return `
      <div class="ve-no-selection">
        <i class="fa fa-hand-pointer"></i>
        <p>请从左侧选择要编辑的元素</p>
        <p style="font-size: 12px; color: #666;">每个元素都有专属的可编辑属性</p>
        <p style="font-size: 12px; color: #4CAF50;">原生实时预览已启用，修改会立即显示</p>
      </div>
    `;
  }

  /**
   * 渲染模板页面
   */
  renderTemplates() {
    // 从模块获取模板，而不是从window对象
    const templates = this.module.quickTemplates ?
      Object.entries(this.module.quickTemplates) : [];

    return `
      <div class="ve-templates-layout">
        <div class="ve-templates-header">
          <h4>快速样式模板</h4>
          <p>点击模板快速应用预定义样式组合</p>
        </div>
        
        <div class="ve-templates-grid">
          ${templates.map(([key, template]) => `
            <div class="ve-template-card" data-template="${key}">
              <div class="ve-template-name">
                <i class="fa fa-magic"></i> ${template.name}
              </div>
              <div class="ve-template-preview">
                ${Object.entries(template.styles).slice(0, 3).map(([sel, props]) =>
      `${sel}: ${Object.keys(props).slice(0, 2).join(', ')}...`
    ).join('<br>')}
              </div>
              <button class="ve-btn-small ve-apply-template" data-template="${key}">
                应用模板
              </button>
            </div>
          `).join('')}
        </div>
        
        <div class="ve-templates-tips">
          <h5>提示</h5>
          <ul>
            <li>模板会覆盖现有样式</li>
            <li>应用后可以继续调整</li>
            <li>使用撤销功能可以恢复之前的样式</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * 获取分类标签
   */
  getCategoryLabel(category) {
    const labels = {
      message: '消息相关',
      input: '输入相关',
      character: '角色相关',
      worldbook: '世界书',
      layout: '布局',
      controls: '控件',
      popup: '弹窗',
      icons: '图标替换'
    };
    return labels[category] || category;
  }

  /**
   * 绑定事件（增强版，添加图标组相关事件）
   */
  bindEvents() {
    // 清理旧的事件监听器
    this.cleanupEvents();

    // 标签页切换
    this.addEvent('.ve-tab-btn', 'click', (e) => {
      this.currentTab = e.currentTarget.dataset.tab;
      this.render();
      this.bindEvents();
    });

    // 元素选择 - 统一绑定方法（避免在不同渲染路径重复实现）
    this.bindElementListClicks();

    // 图标组成员点击（新增）
    this.addEvent('.ve-icon-member', 'click', (e) => {
      const enc = e.currentTarget.dataset.selEnc;
      const selector = enc ? decodeURIComponent(enc) : '';
      if (selector) {
        this.selectedElement = selector;
        this.currentTab = 'elements';
        this.render();
        this.bindEvents();
      }
    });

    // 图标组批量编辑按钮（新增）
    this.addEvent('[data-action="edit-group"]', 'click', (e) => {
      const groupId = e.currentTarget.dataset.group;
      const group = this.registry.getIconGroup(groupId);
      const elements = this.registry.getGroupElements(groupId);

      if (elements.length > 0) {
        // 选择第一个元素并切换到批量模式
        this.selectedElement = elements[0].selector;
        this.currentTab = 'elements';
        this.panelsFactory.batchMode = 'group';
        this.render();
        this.bindEvents();
      }
    });

    // 图标组清除样式按钮（新增）
    this.addEvent('[data-action="clear-group"]', 'click', (e) => {
      const groupId = e.currentTarget.dataset.group;
      const group = this.registry.getIconGroup(groupId);

      if (confirm(`确定要清除"${group.name}"组内所有图标的样式吗？`)) {
        const elements = this.registry.getGroupElements(groupId);
        elements.forEach(element => {
          // 统一调用主模块的清除方法
          this.module.clearElement(element.selector);
        });

        this.module.showMessage(`已清除${elements.length}个图标的样式`, 'success');
        this.refresh();
      }
    });

    // 搜索
    this.addEvent('#ve-element-search', 'input', (e) => {
      this.searchKeyword = e.target.value;
      const listContainer = document.querySelector('.ve-element-list');
      if (listContainer) {
        listContainer.innerHTML = this.renderElementList();
        // 重新绑定元素点击事件
        this.bindElementListClicks();
        // 重新绑定元素点击事件
        this.bindElementClickEvents();
      }
    });

    // 类别过滤
    this.addEvent('#ve-category-filter', 'change', (e) => {
      this.activeCategory = e.target.value;
      const listContainer = document.querySelector('.ve-element-list');
      if (listContainer) {
        listContainer.innerHTML = this.renderElementList();
        // 重新绑定元素点击事件
        this.bindElementListClicks();
        // 重新绑定元素点击事件
        this.bindElementClickEvents();
      }
    });


    // 撤销/重做
    this.addEvent('#ve-undo', 'click', () => {
      this.module.undo();
      this.refresh();
    });

    this.addEvent('#ve-redo', 'click', () => {
      this.module.redo();
      this.refresh();
    });

    // ✅ 简化按钮事件 - 只保留重置功能
    this.addEvent('#ve-reset', 'click', () => {
      if (confirm('确定要重置当前所有编辑吗？')) {
        this.module.resetCurrentEdits();
        this.refresh();
      }
    });

    // 模板应用
    this.addEvent('.ve-apply-template', 'click', (e) => {
      const templateKey = e.currentTarget.dataset.template;
      this.applyTemplate(templateKey);
    });

    // 绑定属性面板事件（如果有选中元素）
    if (this.selectedElement) {
      const container = document.getElementById('ve-properties-container');
      if (container) {
        this.panelsFactory.bindPanelEvents(container);
      }
    }
  }

  /**
   * 绑定元素点击事件（用于动态更新后）- 优化版：避免重复绑定
   */
  bindElementClickEvents() {
    // ⚠️ 注意：这个方法现在只负责重新应用选择状态，不重复绑定事件
    // 实际的点击事件已在 bindEvents() 中通过 addEvent() 统一处理

    // 只需要确保当前选中状态正确显示
    if (this.selectedElement) {
      // 清除所有选择状态
      document.querySelectorAll('.ve-element-item.selected').forEach(el => {
        el.classList.remove('selected');
      });

      // 精确恢复当前选中元素的状态（基于URL编码值匹配）
      const enc = encodeURIComponent(this.selectedElement);
      const currentElement = document.querySelector(`.ve-element-item[data-sel-enc="${enc}"]`);
      if (currentElement) {
        currentElement.classList.add('selected');
      }
    }

  }

  /**
   * 统一绑定元素列表项的点击事件（在列表被重渲染后调用）
   */
  bindElementListClicks() {
    this.addEvent('.ve-element-item', 'click', (e) => {
      const clickedElement = e.currentTarget;
      const enc = clickedElement.dataset.selEnc;
      const newSelector = enc ? decodeURIComponent(enc) : '';

      // 如果点击的是已选中元素，不做任何操作
      if (this.selectedElement === newSelector) {
        return;
      }

      // 精确取消上一个选中元素
      if (this.selectedElement) {
        const prevEnc = encodeURIComponent(this.selectedElement);
        const previousElement = document.querySelector(`.ve-element-item[data-sel-enc="${prevEnc}"]`);
        if (previousElement) {
          previousElement.classList.remove('selected');
        }
      }

      // 精确选中新元素
      this.selectedElement = newSelector;
      clickedElement.classList.add('selected');

      // 重新渲染属性面板并绑定其事件
      const container = document.getElementById('ve-properties-container');
      if (container) {
        container.innerHTML = this.panelsFactory.generateElementPanel(this.selectedElement);
        this.panelsFactory.bindPanelEvents(container);
      }

    });
  }

  /**
   * 应用模板
   */
  applyTemplate(templateKey) {
    // 从模块获取模板
    if (!this.module.quickTemplates || !this.module.quickTemplates[templateKey]) {
      this.module.showMessage('模板不存在', 'error');
      return;
    }

    const template = this.module.quickTemplates[templateKey];

    if (confirm(`确定要应用"${template.name}"模板吗？这会覆盖现有样式。`)) {
      // 应用模板样式
      for (const [selector, properties] of Object.entries(template.styles)) {
        for (const [prop, value] of Object.entries(properties)) {
          this.module.updateStyle(selector, prop, value);
        }
      }

      this.module.showMessage(`已应用模板: ${template.name}`, 'success');
      this.refresh();
    }
  }

  /**
   * 更新预览
   */
  updatePreview() {
    // 更新状态栏
    const statusLeft = this.container.querySelector('#ve-status-text');
    const statusRight = this.container.querySelector('.ve-status-right');

    if (statusLeft) {
      statusLeft.textContent = '原生实时预览模式 - 修改会立即生效';
    }

    if (statusRight) {
      const pendingCount = this.module.pendingStyles.size;
      const appliedCount = this.module.appliedStyles.size;
      const elementCount = this.registry.getAllElements().length;
      const iconGroups = this.registry.iconGroups || {};

      statusRight.innerHTML = `
        <span>元素: ${elementCount}</span>
        <span>待应用: ${pendingCount}</span>
        <span>已保存: ${appliedCount}</span>
        ${Object.keys(iconGroups).length > 0 ? `<span>图标组: ${Object.keys(iconGroups).length}</span>` : ''}
      `;
    }

    // 更新按钮状态
    if (!this.module.realtimePreview) {
      const applyBtn = this.container.querySelector('#ve-apply');
      if (applyBtn) {
        const hasChanges = this.checkHasChanges();
        applyBtn.disabled = !hasChanges;

        const badge = applyBtn.querySelector('.ve-badge');
        const count = this.module.pendingStyles.size;
        if (count > 0 && !badge) {
          applyBtn.insertAdjacentHTML('beforeend', `<span class="ve-badge">${count}</span>`);
        } else if (badge) {
          badge.textContent = count || '';
          if (count === 0) badge.remove();
        }
      }
    }

    // 更新元素列表的绿点指示器
    const listContainer = document.querySelector('.ve-element-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderElementList();
      // 重新绑定元素点击事件
      this.bindElementListClicks();
      // 重新绑定元素点击事件
      this.bindElementClickEvents();
    }
  }

  /**
   * 更新预览模式显示
   */
  updatePreviewMode() {
    this.refresh();
  }

  /**
   * 检查是否有未应用的更改
   */
  checkHasChanges() {
    if (this.module.pendingStyles.size !== this.module.appliedStyles.size) {
      return true;
    }

    for (const [selector, styles] of this.module.pendingStyles) {
      const applied = this.module.appliedStyles.get(selector);
      if (!applied || JSON.stringify(styles) !== JSON.stringify(applied)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 刷新UI
   */
  refresh() {
    this.render();
    this.bindEvents();
  }

  /**
   * 事件管理
   */
  addEvent(selector, event, handler) {
    const elements = this.container.querySelectorAll(selector);
    elements.forEach(el => {
      el.addEventListener(event, handler);
      this.eventListeners.push({ element: el, event, handler });
    });
  }

  cleanupEvents() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * 销毁
   */
  destroy() {
    this.cleanupEvents();
    if (this.panelsFactory) {
      this.panelsFactory.cleanup();
    }
    this.container = null;
  }
}