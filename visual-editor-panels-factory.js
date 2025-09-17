/**
 * 可视化CSS编辑器 - UI面板生成工厂（图标批量操作修复版）
 * 功能：根据元素配置动态生成属性编辑面板，支持图标组批量操作
 * 
 * 创建时间：2025-09-07
 * 修复时间：2025-09-09 - 添加toggle控件和阴影组合处理
 * 修复时间：2025-09-10 - 修复滚动问题，添加条件显示支持
 * 修复时间：2025-01-10 - 移除内联style中的固定高度限制
 * 优化时间：2025-01-XX - 添加滑轨两列布局功能
 * 增强时间：2025-01-XX - 添加图标组批量操作支持
 * 修复时间：2025-01-XX - 修正批量操作参数传递问题
 * 
 * 作者：SGTY & Assistant
 */

export class VisualEditorPanelsFactory {
  constructor(module, registry) {
    this.module = module;
    this.registry = registry;

    // 当前选中的元素
    this.currentElement = null;

    // 批量操作模式（新增）
    this.batchMode = 'single'; // single | group | alternating

    // 属性变化监听器
    this.changeListeners = new Map();

    // 防抖定时器
    this.debounceTimers = new Map();

    // 阴影数据缓存（分离按钮阴影和图标阴影）
    this.shadowDataCache = new Map();

    // 条件显示状态缓存
    this.conditionalVisibility = new Map();

    // 批量操作缓存（新增）
    this.batchOperationCache = new Map();

    // 🚀 极简反向同步 - 监听样式解析事件
    this.setupReverseSync();
  }

  /**
   * 🚀 设置反向同步监听器
   * 当输入框内容被解析后，自动更新操作面板控件
   */
  setupReverseSync() {
    // 监听样式解析事件
    this.module.eventBus.on('styles:parsed', (styles) => {
      if (this.currentElement && this.currentElement.selector) {
        const elementStyles = styles.get(this.currentElement.selector);
        if (elementStyles) {
          this.syncControlsFromStyles(elementStyles);
        }
      }
    });

  }

  /**
   * 🎛️ 同步控件值从样式数据（核心反向同步逻辑）
   * 基于已分析的5种控件类型实现
   */
  syncControlsFromStyles(elementStyles) {
    Object.entries(elementStyles).forEach(([prop, value]) => {
      const control = document.querySelector(`[data-property="${prop}"]`);
      if (!control) return;

      try {
        // ✅ 基于实际控件类型处理（已分析的5种类型）
        if (control.classList.contains('ve-control-slider')) {
          // 滑块控件：提取数值部分
          const numericValue = this.extractNumericValue(value);
          control.value = numericValue;

          // 同步联动的数字输入框
          const numberInput = control.parentElement.querySelector('.ve-control-number');
          if (numberInput) {
            numberInput.value = numericValue;
          }
        } else if (control.type === 'color') {
          // ✅ 颜色控件：保持RGB格式，无需转换
          control.value = value;
        } else if (control.tagName === 'SELECT') {
          // 下拉选择控件
          control.value = value;
        } else if (control.classList.contains('ve-control-toggle')) {
          // 开关控件：检查data-on-value匹配
          const onValue = control.dataset.onValue || 'enabled';
          control.checked = (value === onValue);
        } else {
          // 文本输入框和其他类型
          control.value = value;
        }

      } catch (error) {
        console.warn(`[PanelsFactory] 控件同步失败 ${prop}:`, error);
      }
    });
  }

  /**
   * 🔧 提取数值部分（用于滑块控件）
   */
  extractNumericValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/^(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    }
    return 0;
  }

  /**
   * 生成元素属性面板（增强版）
   */
  generateElementPanel(selector) {
    const element = this.registry.getElement(selector);
    if (!element) {
      return this.generateEmptyPanel();
    }

    this.currentElement = element;

    // 获取当前样式
    const currentStyles = this.module.getElementStyles(selector);

    // 初始化条件显示状态
    this.updateConditionalVisibility(element, currentStyles);

    // 检查是否是图标组成员
    const isGroupMember = !!element.groupId;
    const groupInfo = isGroupMember ? this.registry.getIconGroup(element.groupId) : null;

    // 生成面板HTML（包含批量操作选项）
    const html = this.generatePanelHTML(element, currentStyles, groupInfo);

    return html;
  }

  /**
   * 更新条件显示状态
   */
  updateConditionalVisibility(element, currentStyles) {
    const { editableProperties = {} } = element;
    this.conditionalVisibility.clear();

    for (const [propName, propConfig] of Object.entries(editableProperties)) {
      if (propConfig.showIf) {
        // 解析条件，格式如 "button-shadow-enabled:enabled"
        const [condProp, condValue] = propConfig.showIf.split(':');
        const actualValue = currentStyles[condProp] || '';
        const isVisible = actualValue === condValue;
        this.conditionalVisibility.set(propName, isVisible);
      } else {
        this.conditionalVisibility.set(propName, true);
      }
    }
  }

  /**
   * 生成面板HTML（增强版，支持批量操作）
   */
  generatePanelHTML(element, currentStyles, groupInfo) {
    const { displayName, selector, editableProperties = {} } = element;

    // 按类别组织属性
    const propertyGroups = this.groupProperties(editableProperties, currentStyles);

    // 生成批量操作控制条（如果是组成员）
    const batchControlBar = groupInfo ? this.generateBatchControlBar(element, groupInfo) : '';

    return `
      <div class="ve-element-panel" data-selector="${selector}">
        <div class="ve-panel-header">
          <h4>${displayName}</h4>
          <div class="ve-panel-actions">
            <button class="ve-btn-small ve-clear-btn" title="清除此元素样式">
              <i class="fa fa-eraser"></i>
            </button>
          </div>
        </div>
        
        ${batchControlBar}
        
        <div class="ve-panel-body" style="overflow-y: auto;">
          ${this.generatePropertyGroups(propertyGroups, currentStyles)}
        </div>
      </div>
      <style>
        /* 批量操作控制条样式 */
        .ve-batch-control-bar {
          padding: 10px;
          background: rgba(var(--SmartThemeQuoteColor-rgb), 0.1);
          border-bottom: 1px solid var(--SmartThemeBorderColor);
        }
        
        .ve-batch-control-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .ve-batch-info {
          font-size: 0.85em;
          color: var(--SmartThemeQuoteColor);
        }
        
        .ve-batch-mode-selector {
          display: flex;
          gap: 5px;
        }
        
        .ve-batch-mode-btn {
          padding: 4px 8px;
          font-size: 0.8em;
          background: transparent;
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .ve-batch-mode-btn.active {
          background: var(--SmartThemeQuoteColor);
          color: white;
          border-color: var(--SmartThemeQuoteColor);
        }
        
        .ve-batch-mode-btn:hover:not(.active) {
          background: rgba(var(--SmartThemeQuoteColor-rgb), 0.2);
        }
        
        .ve-batch-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        
        .ve-batch-action-btn {
          flex: 1;
          padding: 5px 10px;
          font-size: 0.85em;
          background: var(--SmartThemeButtonColor);
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .ve-batch-action-btn:hover {
          background: var(--SmartThemeQuoteColor);
          color: white;
        }
        
        .ve-alternating-options {
          display: none;
          margin-top: 8px;
          padding: 8px;
          background: rgba(0,0,0,0.05);
          border-radius: 3px;
        }
        
        .ve-alternating-options.show {
          display: block;
        }
        
        .ve-alternating-row {
          display: flex;
          gap: 10px;
          margin-bottom: 5px;
          align-items: center;
        }
        
        .ve-alternating-label {
          font-size: 0.8em;
          width: 60px;
        }
        
        .ve-alternating-preview {
          display: flex;
          gap: 5px;
          align-items: center;
        }
        
        .ve-preview-box {
          width: 20px;
          height: 20px;
          border: 1px solid var(--SmartThemeBorderColor);
          border-radius: 3px;
        }
        
        /* 美化滚动条 */
        .ve-panel-body::-webkit-scrollbar {
          width: 8px;
        }
        .ve-panel-body::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 4px;
        }
        .ve-panel-body::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
        }
        .ve-panel-body::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.3);
        }
        
        /* 条件显示样式 */
        .ve-control-item.ve-hidden {
          display: none !important;
        }
        
        /* 分组标题样式 */
        .ve-group-header {
          position: sticky;
          top: -10px;
          background: var(--SmartThemeBlurTintColor);
          z-index: 10;
          padding: 8px 0;
          margin: 10px 0 5px 0;
          border-bottom: 1px solid var(--SmartThemeBorderColor);
        }
        
        /* 确保内容底部有足够间距 */
        .ve-panel-body > :last-child {
          margin-bottom: 20px;
        }
      </style>
    `;
  }

  /**
   * 生成批量操作控制条（新增）
   */
  generateBatchControlBar(element, groupInfo) {
    const groupElements = this.registry.getGroupElements(element.groupId);
    const subGroups = groupInfo.subGroups || {};

    return `
      <div class="ve-batch-control-bar">
        <div class="ve-batch-control-header">
          <div class="ve-batch-info">
            <i class="fa fa-layer-group"></i>
            <span>组: ${groupInfo.name} (${groupElements.length}个图标)</span>
          </div>
          <div class="ve-batch-mode-selector">
            <button class="ve-batch-mode-btn ${this.batchMode === 'single' ? 'active' : ''}" 
                    data-mode="single" title="单独编辑当前图标">
              <i class="fa fa-user"></i> 单独
            </button>
            <button class="ve-batch-mode-btn ${this.batchMode === 'group' ? 'active' : ''}" 
                    data-mode="group" title="统一应用到整组">
              <i class="fa fa-users"></i> 统一
            </button>
            <button class="ve-batch-mode-btn ${this.batchMode === 'alternating' ? 'active' : ''}" 
                    data-mode="alternating" title="奇偶交替样式">
              <i class="fa fa-grip-vertical"></i> 交替
            </button>
          </div>
        </div>
        
        <div class="ve-batch-actions">
          <button class="ve-batch-action-btn" id="ve-batch-apply-group" 
                  style="display: ${this.batchMode === 'group' ? 'block' : 'none'}">
            <i class="fa fa-check"></i> 应用到整组
          </button>
          <button class="ve-batch-action-btn" id="ve-batch-copy-from" 
                  style="display: ${this.batchMode === 'group' ? 'block' : 'none'}">
            <i class="fa fa-copy"></i> 从其他图标复制
          </button>
        </div>
        
        <div class="ve-alternating-options ${this.batchMode === 'alternating' ? 'show' : ''}">
          <div class="ve-alternating-row">
            <span class="ve-alternating-label">奇数位置:</span>
            <div class="ve-alternating-preview" id="ve-odd-preview">
              <div class="ve-preview-box" style="background: #f0f0f0"></div>
              <span>样式A</span>
            </div>
            <button class="ve-btn-small" id="ve-set-odd-style">设置</button>
          </div>
          <div class="ve-alternating-row">
            <span class="ve-alternating-label">偶数位置:</span>
            <div class="ve-alternating-preview" id="ve-even-preview">
              <div class="ve-preview-box" style="background: #e0e0e0"></div>
              <span>样式B</span>
            </div>
            <button class="ve-btn-small" id="ve-set-even-style">设置</button>
          </div>
          <button class="ve-batch-action-btn" id="ve-batch-apply-alternating">
            <i class="fa fa-magic"></i> 应用交替样式
          </button>
        </div>
        
        ${Object.keys(subGroups).length > 0 ? `
          <div class="ve-sub-groups" style="margin-top: 8px;">
            <span style="font-size: 0.8em;">子组操作:</span>
            ${Object.entries(subGroups).map(([subId, members]) => `
              <button class="ve-btn-small" data-subgroup="${subId}">
                ${subId === 'character' ? '角色消息' : '用户消息'} (${members.length})
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成属性组
   */
  generatePropertyGroups(groups, currentStyles) {
    let html = '';

    for (const [groupName, properties] of Object.entries(groups)) {
      if (Object.keys(properties).length === 0) continue;

      // 检查组内是否有可见的属性
      let hasVisibleProperties = false;
      for (const propName of Object.keys(properties)) {
        if (this.conditionalVisibility.get(propName)) {
          hasVisibleProperties = true;
          break;
        }
      }

      // 如果组内没有可见属性，跳过整个组
      if (!hasVisibleProperties && groupName !== 'icon' && groupName !== 'size' && groupName !== 'effects') {
        continue;
      }

      html += `
        <div class="ve-property-group" data-group="${groupName}">
          <div class="ve-group-header">
            <h5>${this.getGroupLabel(groupName)}</h5>
          </div>
          <div class="ve-group-content">
            ${this.generatePropertiesWithSliderGrouping(properties, currentStyles)}
          </div>
        </div>
      `;
    }

    return html || '<div class="ve-no-properties">此元素暂无可编辑属性</div>';
  }

  /**
   * 生成属性控件（支持滑轨分组）
   */
  generatePropertiesWithSliderGrouping(properties, currentStyles) {
    let html = '';
    const propertyArray = Object.entries(properties);
    let i = 0;

    while (i < propertyArray.length) {
      const [propName, propConfig] = propertyArray[i];
      const isVisible = this.conditionalVisibility.get(propName);

      // 检查当前是否是滑轨控件
      if (propConfig.type === 'slider') {
        // 查找下一个属性是否也是滑轨
        let nextSliderIndex = -1;
        for (let j = i + 1; j < propertyArray.length; j++) {
          const [nextPropName, nextPropConfig] = propertyArray[j];
          const nextIsVisible = this.conditionalVisibility.get(nextPropName);

          // 如果下一个是可见的滑轨，记录索引
          if (nextPropConfig.type === 'slider' && nextIsVisible) {
            nextSliderIndex = j;
            break;
          }
          // 如果遇到非滑轨控件，停止查找
          if (nextPropConfig.type !== 'slider') {
            break;
          }
        }

        // 如果找到了配对的滑轨，创建分组
        if (nextSliderIndex !== -1) {
          const [nextPropName, nextPropConfig] = propertyArray[nextSliderIndex];
          const value1 = currentStyles[propName] || '';
          const value2 = currentStyles[nextPropName] || '';

          html += '<div class="ve-slider-group">';

          // 第一个滑轨
          if (propConfig.showIf) {
            html += `<div class="ve-conditional-wrapper ${isVisible ? '' : 've-hidden'}" data-show-if="${propConfig.showIf}">`;
          }
          html += this.registry.renderControl(propConfig.type, propName, value1, propConfig);
          if (propConfig.showIf) {
            html += '</div>';
          }

          // 第二个滑轨
          const nextIsVisible = this.conditionalVisibility.get(nextPropName);
          if (nextPropConfig.showIf) {
            html += `<div class="ve-conditional-wrapper ${nextIsVisible ? '' : 've-hidden'}" data-show-if="${nextPropConfig.showIf}">`;
          }
          html += this.registry.renderControl(nextPropConfig.type, nextPropName, value2, nextPropConfig);
          if (nextPropConfig.showIf) {
            html += '</div>';
          }

          html += '</div>';

          // 跳过已处理的滑轨
          i = nextSliderIndex + 1;
          continue;
        }
      }

      // 单个控件（包括单个滑轨）的处理
      const value = currentStyles[propName] || '';
      const controlHtml = this.registry.renderControl(
        propConfig.type,
        propName,
        value,
        propConfig
      );

      // 添加条件显示包装
      if (propConfig.showIf) {
        html += `<div class="ve-conditional-wrapper ${isVisible ? '' : 've-hidden'}" data-show-if="${propConfig.showIf}">`;
      }

      html += controlHtml;

      if (propConfig.showIf) {
        html += '</div>';
      }

      i++;
    }

    return html;
  }

  /**
   * 属性分组（扩展版）
   */
  groupProperties(properties) {
    const groups = {
      layout: {},            // 布局控制
      icon: {},              // 图标基础
      size: {},              // 尺寸
      'button-shadow': {},   // 按钮阴影
      'icon-shadow': {},     // 图标阴影
      effects: {},           // 特效
      basic: {},             // 基础样式
      text: {},              // 文字样式
      background: {},        // 背景样式 (修复：信息显示元素需要)
      spacing: {},           // 间距
      border: {},            // 边框
      advanced: {}           // 高级
    };

    // 属性分类映射（扩展）
    const categoryMap = {
      'background-color': 'basic',
      'background-image': 'icon',
      'background': 'basic',
      'background-size': 'size',
      'opacity': 'effects',
      'icon-color': 'icon',

      'color': 'text',
      'font-size': 'text',
      'font-weight': 'text',
      'font-family': 'text',
      'line-height': 'text',
      'text-align': 'text',

      'width': 'size',
      'height': 'size',
      'max-width': 'size',
      'min-width': 'size',
      'max-height': 'size',
      'min-height': 'size',

      'padding': 'spacing',
      'padding-top': 'spacing',
      'padding-right': 'spacing',
      'padding-bottom': 'spacing',
      'padding-left': 'spacing',
      'margin': 'spacing',
      'margin-top': 'spacing',
      'margin-right': 'spacing',
      'margin-bottom': 'spacing',
      'margin-left': 'spacing',

      'border': 'border',
      'border-width': 'border',
      'border-style': 'border',
      'border-color': 'border',
      'border-radius': 'border',

      // 按钮阴影属性
      'button-shadow-enabled': 'button-shadow',
      'button-shadow-x': 'button-shadow',
      'button-shadow-y': 'button-shadow',
      'button-shadow-blur': 'button-shadow',
      'button-shadow-spread': 'button-shadow',
      'button-shadow-color': 'button-shadow',
      'button-shadow-opacity': 'button-shadow',

      // 图标阴影属性
      'icon-shadow-enabled': 'icon-shadow',
      'icon-shadow-x': 'icon-shadow',
      'icon-shadow-y': 'icon-shadow',
      'icon-shadow-blur': 'icon-shadow',
      'icon-shadow-color': 'icon-shadow',
      'icon-shadow-opacity': 'icon-shadow',

      'filter': 'effects',
      'blur': 'effects',
      'brightness': 'effects',
      'contrast': 'effects',
      'grayscale': 'effects',
      'transform': 'effects',
      'transition': 'effects',
      'animation': 'effects',

      'cursor': 'advanced',
      'position': 'advanced',
      'z-index': 'advanced'
    };

    // 分组属性
    for (const [propName, propConfig] of Object.entries(properties)) {
      const category = propConfig.category || categoryMap[propName] || 'advanced';
      groups[category][propName] = propConfig;
    }

    return groups;
  }

  /**
   * 获取组标签
   */
  getGroupLabel(groupName) {
    const labels = {
      layout: '布局控制',
      icon: '图标设置',
      basic: '基础样式',
      text: '文字样式',
      background: '背景样式',    // 修复：信息显示元素需要
      size: '尺寸',
      spacing: '间距',
      border: '边框',
      'button-shadow': '按钮阴影',
      'icon-shadow': '图标阴影',
      effects: '特效',
      advanced: '高级'
    };
    return labels[groupName] || groupName;
  }

  /**
   * 生成空面板
   */
  generateEmptyPanel() {
    return `
      <div class="ve-empty-panel">
        <i class="fa fa-hand-pointer"></i>
        <p>请从左侧选择要编辑的元素</p>
        <p class="ve-hint">每个元素都有专属的编辑选项</p>
      </div>
    `;
  }

  /**
   * 绑定面板事件（增强版，支持批量操作）
   */
  bindPanelEvents(container) {
    if (!container) return;

    // 清除旧的事件监听
    this.unbindPanelEvents();

    // 批量操作模式切换（新增）
    container.querySelectorAll('.ve-batch-mode-btn').forEach(btn => {
      const handler = (e) => this.handleBatchModeChange(e);
      btn.addEventListener('click', handler);
      this.addListener(btn, 'click', handler);
    });

    // 批量应用按钮（新增）
    const batchApplyBtn = container.querySelector('#ve-batch-apply-group');
    if (batchApplyBtn) {
      const handler = () => this.handleBatchApply();
      batchApplyBtn.addEventListener('click', handler);
      this.addListener(batchApplyBtn, 'click', handler);
    }

    // 批量复制按钮（新增）
    const batchCopyBtn = container.querySelector('#ve-batch-copy-from');
    if (batchCopyBtn) {
      const handler = () => this.handleBatchCopy();
      batchCopyBtn.addEventListener('click', handler);
      this.addListener(batchCopyBtn, 'click', handler);
    }

    // 交替样式设置按钮（新增）
    const setOddBtn = container.querySelector('#ve-set-odd-style');
    if (setOddBtn) {
      const handler = () => this.handleSetAlternatingStyle('odd');
      setOddBtn.addEventListener('click', handler);
      this.addListener(setOddBtn, 'click', handler);
    }

    const setEvenBtn = container.querySelector('#ve-set-even-style');
    if (setEvenBtn) {
      const handler = () => this.handleSetAlternatingStyle('even');
      setEvenBtn.addEventListener('click', handler);
      this.addListener(setEvenBtn, 'click', handler);
    }

    const applyAlternatingBtn = container.querySelector('#ve-batch-apply-alternating');
    if (applyAlternatingBtn) {
      const handler = () => this.handleApplyAlternating();
      applyAlternatingBtn.addEventListener('click', handler);
      this.addListener(applyAlternatingBtn, 'click', handler);
    }

    // 子组操作按钮（新增）
    container.querySelectorAll('[data-subgroup]').forEach(btn => {
      const handler = (e) => this.handleSubGroupOperation(e);
      btn.addEventListener('click', handler);
      this.addListener(btn, 'click', handler);
    });

    // 原有的控件事件绑定
    // 颜色控件
    container.querySelectorAll('.ve-control-color').forEach(input => {
      const handler = (e) => this.handleColorChange(e);
      input.addEventListener('input', handler);
      this.addListener(input, 'input', handler);
    });

    container.querySelectorAll('.ve-control-color-text').forEach(input => {
      const handler = (e) => this.handleColorTextChange(e);
      input.addEventListener('input', handler);
      this.addListener(input, 'input', handler);
    });

    // 滑块控件
    container.querySelectorAll('.ve-control-slider').forEach(input => {
      const handler = (e) => this.handleSliderChange(e);
      input.addEventListener('input', handler);
      this.addListener(input, 'input', handler);
    });

    // 数字控件
    container.querySelectorAll('.ve-control-number').forEach(input => {
      const handler = (e) => this.handleNumberChange(e);
      input.addEventListener('input', handler);
      this.addListener(input, 'input', handler);
    });

    // 选择控件
    container.querySelectorAll('.ve-control-select').forEach(select => {
      const handler = (e) => this.handleSelectChange(e);
      select.addEventListener('change', handler);
      this.addListener(select, 'change', handler);
    });

    // 文本控件
    container.querySelectorAll('.ve-control-text').forEach(input => {
      const handler = (e) => this.handleTextChange(e);
      input.addEventListener('input', handler);
      this.addListener(input, 'input', handler);
    });

    // 开关控件
    container.querySelectorAll('.ve-toggle-control input[type="checkbox"]').forEach(input => {
      const handler = (e) => {
        this.handleToggleChange(e);
        const property = e.target.dataset.property;
        const value = e.target.checked ?
          (e.target.dataset.onValue || 'enabled') :
          (e.target.dataset.offValue || 'disabled');
        this.updateConditionalDisplays(container, property, value);
      };
      input.addEventListener('change', handler);
      this.addListener(input, 'change', handler);
    });

    // 清除按钮
    container.querySelectorAll('.ve-clear-btn').forEach(btn => {
      const handler = (e) => this.handleClearProperty(e);
      btn.addEventListener('click', handler);
      this.addListener(btn, 'click', handler);
    });


    // 清除元素按钮
    const clearBtn = container.querySelector('.ve-clear-btn');
    if (clearBtn && !clearBtn.dataset.property) {
      const handler = () => this.handleClearElement();
      clearBtn.addEventListener('click', handler);
      this.addListener(clearBtn, 'click', handler);
    }
  }

  /**
   * 处理批量模式切换（新增）
   */
  handleBatchModeChange(e) {
    const newMode = e.currentTarget.dataset.mode;
    this.batchMode = newMode;

    // 更新按钮状态
    document.querySelectorAll('.ve-batch-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    // 显示/隐藏相应的控制选项
    const batchApplyBtn = document.querySelector('#ve-batch-apply-group');
    const batchCopyBtn = document.querySelector('#ve-batch-copy-from');
    const alternatingOptions = document.querySelector('.ve-alternating-options');

    if (batchApplyBtn) batchApplyBtn.style.display = newMode === 'group' ? 'block' : 'none';
    if (batchCopyBtn) batchCopyBtn.style.display = newMode === 'group' ? 'block' : 'none';
    if (alternatingOptions) alternatingOptions.classList.toggle('show', newMode === 'alternating');
  }

  /**
   * 处理批量应用（修正版）
   */
  handleBatchApply() {
    if (!this.currentElement || !this.currentElement.groupId) return;

    // 获取当前元素的样式
    const currentStyles = this.module.getElementStyles(this.currentElement.selector);
    if (!currentStyles || Object.keys(currentStyles).length === 0) {
      this.module.showMessage('没有样式需要应用', 'warning');
      return;
    }

    const groupId = this.currentElement.groupId;

    // 应用到整组 - 修复：确保styles不是const
    let styles = { ...currentStyles }; // 创建副本
    const results = this.registry.applyToGroup(groupId, styles);

    // 显示实际应用的数量（应该是图标数，而不是图标数×属性数）
    const uniqueSelectors = new Set(results.map(r => r.selector));
    this.module.showMessage(`已应用样式到${uniqueSelectors.size}个图标`, 'success');
  }

  /**
   * 处理批量复制（新增）
   */
  handleBatchCopy() {
    const sourceSelector = prompt('请输入要复制样式的图标选择器：\n例如：#leftNavDrawerIcon');
    if (!sourceSelector) return;

    const sourceElement = document.querySelector(sourceSelector);
    if (!sourceElement || !sourceElement._iconData) {
      this.module.showMessage('源图标没有样式数据', 'error');
      return;
    }

    if (this.currentElement && this.currentElement.groupId) {
      const results = this.registry.copyStylesToGroup(sourceSelector, this.currentElement.groupId);
      this.module.showMessage(`已复制样式到${results.length}个图标`, 'success');
    }
  }

  /**
   * 处理交替样式设置（新增）
   */
  handleSetAlternatingStyle(type) {
    if (!this.currentElement) return;

    const currentStyles = this.module.getElementStyles(this.currentElement.selector);

    // 缓存交替样式
    if (!this.batchOperationCache.has('alternating')) {
      this.batchOperationCache.set('alternating', { odd: {}, even: {} });
    }

    const alternatingStyles = this.batchOperationCache.get('alternating');
    alternatingStyles[type] = { ...currentStyles };

    // 更新预览
    const previewBox = document.querySelector(`#ve-${type}-preview .ve-preview-box`);
    if (previewBox && currentStyles['background-image']) {
      previewBox.style.background = `url(${currentStyles['background-image']}) center/contain no-repeat`;
    }

    this.module.showMessage(`已设置${type === 'odd' ? '奇数' : '偶数'}位置样式`, 'info');
  }

  /**
   * 处理应用交替样式（修正版）
   */
  handleApplyAlternating() {
    if (!this.currentElement || !this.currentElement.groupId) return;

    const alternatingStyles = this.batchOperationCache.get('alternating');
    if (!alternatingStyles || !alternatingStyles.odd || !alternatingStyles.even) {
      this.module.showMessage('请先设置奇偶位置的样式', 'warning');
      return;
    }

    const groupId = this.currentElement.groupId;
    // 修正：使用正确的参数格式
    const results = this.registry.applyToGroup(groupId, null, {
      alternating: true,
      oddStyles: alternatingStyles.odd,
      evenStyles: alternatingStyles.even
    });

    this.module.showMessage(`已应用交替样式到${results.length}个图标`, 'success');
  }

  /**
   * 处理子组操作（新增）
   */
  handleSubGroupOperation(e) {
    const subGroupId = e.currentTarget.dataset.subgroup;
    if (!this.currentElement || !this.currentElement.groupId) return;

    const currentStyles = this.module.getElementStyles(this.currentElement.selector);
    const elements = this.registry.getSubGroupElements(this.currentElement.groupId, subGroupId);

    // 应用到子组
    elements.forEach(element => {
      const callback = this.registry.getElementCallback(element.selector);
      if (callback) {
        for (const [prop, val] of Object.entries(currentStyles)) {
          callback(element.selector, prop, val);
        }
      }
    });

    this.module.showMessage(`已应用样式到${elements.length}个${subGroupId}图标`, 'success');
  }

  /**
   * 更新条件显示
   */
  updateConditionalDisplays(container, changedProperty, newValue) {
    const conditionalWrappers = container.querySelectorAll('.ve-conditional-wrapper[data-show-if]');

    conditionalWrappers.forEach(wrapper => {
      const condition = wrapper.dataset.showIf;
      const [condProp, condValue] = condition.split(':');

      if (condProp === changedProperty) {
        const shouldShow = newValue.toString() === condValue ||
          (newValue === true && condValue === 'enabled') ||
          (newValue === false && condValue === 'disabled');

        if (shouldShow) {
          wrapper.classList.remove('ve-hidden');
        } else {
          wrapper.classList.add('ve-hidden');
        }
      }
    });
  }

  /**
   * 处理颜色变化
   */
  handleColorChange(e) {
    const property = e.target.dataset.property;
    const value = e.target.value;

    // 同步文本输入
    const textInput = e.target.parentElement.querySelector('.ve-control-color-text');
    if (textInput) {
      textInput.value = value;
    }

    this.updateProperty(property, value);
  }

  /**
   * 处理颜色文本变化
   */
  handleColorTextChange(e) {
    const property = e.target.dataset.property;
    const value = e.target.value;

    // 同步颜色选择器
    const colorInput = e.target.parentElement.querySelector('.ve-control-color');
    if (colorInput && value.match(/^#[0-9a-fA-F]{6}$/)) {
      colorInput.value = value;
    }

    this.updateProperty(property, value);
  }

  /**
   * 处理滑块变化
   */
  handleSliderChange(e) {
    const property = e.target.dataset.property;
    const value = e.target.value;

    // 同步数字输入
    const numberInput = e.target.parentElement.querySelector('.ve-control-number');
    if (numberInput) {
      numberInput.value = value;
    }

    // 获取单位
    const unit = e.target.parentElement.querySelector('span')?.textContent || '';

    // 分别处理按钮阴影和图标阴影
    if (property.startsWith('button-shadow-')) {
      this.handleButtonShadowChange(property, value + unit);
    } else if (property.startsWith('icon-shadow-')) {
      this.handleIconShadowChange(property, value + unit);
    } else {
      this.updateProperty(property, value + unit);
    }
  }

  /**
   * 处理数字变化
   */
  handleNumberChange(e) {
    const property = e.target.dataset.property;
    const value = e.target.value;

    // 同步滑块
    const slider = e.target.parentElement.querySelector('.ve-control-slider');
    if (slider) {
      slider.value = value;
    }

    // 获取单位
    const unit = e.target.parentElement.querySelector('span')?.textContent || '';

    // 分别处理按钮阴影和图标阴影
    if (property.startsWith('button-shadow-')) {
      this.handleButtonShadowChange(property, value ? value + unit : '');
    } else if (property.startsWith('icon-shadow-')) {
      this.handleIconShadowChange(property, value ? value + unit : '');
    } else {
      this.updateProperty(property, value ? value + unit : '');
    }
  }

  /**
   * 处理选择变化
   */
  handleSelectChange(e) {
    const property = e.target.dataset.property;
    const value = e.target.value;
    this.updateProperty(property, value);
  }

  /**
   * 处理文本变化
   */
  handleTextChange(e) {
    const property = e.target.dataset.property;
    const value = e.target.value;
    this.updateProperty(property, value);
  }

  /**
   * 处理开关变化
   */
  handleToggleChange(e) {
    const property = e.target.dataset.property;
    const onValue = e.target.dataset.onValue || 'on';
    const offValue = e.target.dataset.offValue || 'off';
    const value = e.target.checked ? onValue : offValue;

    // 分别处理按钮阴影和图标阴影启用状态
    if (property === 'button-shadow-enabled') {
      this.handleButtonShadowChange(property, value);
    } else if (property === 'icon-shadow-enabled') {
      this.handleIconShadowChange(property, value);
    } else {
      this.updateProperty(property, value);
    }
  }

  /**
   * 处理按钮阴影属性变化
   */
  handleButtonShadowChange(property, value) {
    if (!this.currentElement) return;

    const selector = this.currentElement.selector;

    // 获取或初始化按钮阴影数据
    if (!this.shadowDataCache.has(selector)) {
      this.shadowDataCache.set(selector, {
        button: {
          'button-shadow-x': '0px',
          'button-shadow-y': '2px',
          'button-shadow-blur': '4px',
          'button-shadow-spread': '0px',
          'button-shadow-color': 'rgba(0,0,0,0.2)',
          'button-shadow-enabled': 'disabled'
        },
        icon: {
          'icon-shadow-x': '0px',
          'icon-shadow-y': '2px',
          'icon-shadow-blur': '4px',
          'icon-shadow-color': 'rgba(0,0,0,0.2)',
          'icon-shadow-enabled': 'disabled'
        }
      });
    }

    const shadowData = this.shadowDataCache.get(selector);
    shadowData.button[property] = value;

    // 保存单独的属性
    this.updateProperty(property, value);
  }

  /**
   * 处理图标阴影属性变化
   */
  handleIconShadowChange(property, value) {
    if (!this.currentElement) return;

    const selector = this.currentElement.selector;

    // 获取或初始化图标阴影数据
    if (!this.shadowDataCache.has(selector)) {
      this.shadowDataCache.set(selector, {
        button: {
          'button-shadow-x': '0px',
          'button-shadow-y': '2px',
          'button-shadow-blur': '4px',
          'button-shadow-spread': '0px',
          'button-shadow-color': 'rgba(0,0,0,0.2)',
          'button-shadow-enabled': 'disabled'
        },
        icon: {
          'icon-shadow-x': '0px',
          'icon-shadow-y': '2px',
          'icon-shadow-blur': '4px',
          'icon-shadow-color': 'rgba(0,0,0,0.2)',
          'icon-shadow-enabled': 'disabled'
        }
      });
    }

    const shadowData = this.shadowDataCache.get(selector);
    shadowData.icon[property] = value;

    // 保存单独的属性
    this.updateProperty(property, value);
  }

  /**
   * 处理清除属性
   */
  handleClearProperty(e) {
    const property = e.target.dataset.property;
    if (property) {
      this.updateProperty(property, '');

      // 清空相关输入
      const parent = e.target.closest('.ve-control-item');
      if (parent) {
        parent.querySelectorAll('input').forEach(input => {
          if (input.type === 'text' || input.type === 'number') {
            input.value = '';
          } else if (input.type === 'checkbox') {
            input.checked = false;
          }
        });
      }
    }
  }

  /**
   * 处理重置元素
   */
  handleResetElement() {
    if (!this.currentElement) return;

    const { selector, editableProperties } = this.currentElement;

    // 恢复默认值
    for (const [propName, propConfig] of Object.entries(editableProperties)) {
      if (propConfig.defaultValue !== undefined) {
        this.updateProperty(propName, propConfig.defaultValue);
      }
    }

    // 清除阴影缓存
    this.shadowDataCache.delete(selector);

    // 刷新面板
    if (this.module.ui) {
      this.module.ui.refresh();
    }
  }

  /**
   * 处理清除元素
   */
  handleClearElement() {
    if (!this.currentElement) return;

    const { selector } = this.currentElement;

    // 🚀 统一调用主模块的清除方法（替换直接调用）
    this.module.clearElement(selector);
    this.module.addToHistory();

    // 清除阴影缓存
    this.shadowDataCache.delete(selector);

    // ✅ 直接应用到CSS输入框 - 使用原生实时预览
    this.module.applyStylesToCSS();

    // 刷新面板
    if (this.module.ui) {
      this.module.ui.refresh();
    }
  }

  /**
   * 更新属性（修正版，支持批量模式）
   */
  updateProperty(property, value) {
    if (!this.currentElement) return;

    const selector = this.currentElement.selector;

    // 根据批量模式决定更新范围
    if (this.batchMode === 'group' && this.currentElement.groupId) {
      // 🔧 修复：批量更新整组，复用单独设置的完整逻辑
      const groupElements = this.registry.getGroupElements(this.currentElement.groupId);

      // 为组内每个元素执行完整的单独设置逻辑
      groupElements.forEach(element => {
        const elementSelector = element.selector;

        // 检查是否有onStyleApply回调
        const callback = this.registry.getElementCallback(elementSelector);
        if (callback) {
          const result = callback(elementSelector, property, value);
          if (result) {
            // 如果有额外样式，应用到DOM元素
            if (result.additionalStyles) {
              const domElement = document.querySelector(elementSelector);
              if (domElement) {
                for (const [prop, val] of Object.entries(result.additionalStyles)) {
                  const camelProp = prop.replace(/-([a-z])/g, (match, p1) => p1.toUpperCase());
                  domElement.style[camelProp] = val;

                  // 同时更新到模块的样式存储
                  this.module.updateStyle(elementSelector, prop, val);
                }

                // 特殊处理background和filter属性
                if (result.additionalStyles['background']) {
                  domElement.style.setProperty('background', result.additionalStyles['background'], 'important');
                }
                if (result.additionalStyles['filter']) {
                  domElement.style.setProperty('filter', result.additionalStyles['filter'], 'important');
                }
                if (result.additionalStyles['box-shadow']) {
                  domElement.style.setProperty('box-shadow', result.additionalStyles['box-shadow'], 'important');
                }
              }
            }
            // 如果有额外CSS，注入到页面
            if (result.additionalCSS) {
              this.injectAdditionalCSS(elementSelector, result.additionalCSS);
            }
          }
        }

        // 正常更新样式到模块存储
        this.module.updateStyle(elementSelector, property, value);
      });
    } else if (this.batchMode === 'alternating' && this.currentElement.groupId) {
      // 暂存交替样式（不立即应用）
      if (!this.batchOperationCache.has('alternating-pending')) {
        this.batchOperationCache.set('alternating-pending', {});
      }
      const pending = this.batchOperationCache.get('alternating-pending');
      pending[property] = value;
    } else {
      // 单独更新
      const key = `${selector}-${property}`;

      // 清除之前的定时器
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }

      // 设置新的定时器
      const timer = setTimeout(() => {
        // 检查是否有onStyleApply回调
        const callback = this.registry.getElementCallback(selector);
        if (callback) {
          const result = callback(selector, property, value);
          if (result) {
            // 如果有额外样式，应用到元素
            if (result.additionalStyles) {
              const element = document.querySelector(selector);
              if (element) {
                for (const [prop, val] of Object.entries(result.additionalStyles)) {
                  const camelProp = prop.replace(/-([a-z])/g, (match, p1) => p1.toUpperCase());
                  element.style[camelProp] = val;

                  // 同时更新到模块的样式存储
                  this.module.updateStyle(selector, prop, val);
                }

                // 特殊处理background和filter属性
                if (result.additionalStyles['background']) {
                  element.style.setProperty('background', result.additionalStyles['background'], 'important');
                }
                if (result.additionalStyles['filter']) {
                  element.style.setProperty('filter', result.additionalStyles['filter'], 'important');
                }
                if (result.additionalStyles['box-shadow']) {
                  element.style.setProperty('box-shadow', result.additionalStyles['box-shadow'], 'important');
                }
              }
            }
            // 如果有额外CSS，注入到页面
            if (result.additionalCSS) {
              this.injectAdditionalCSS(selector, result.additionalCSS);
            }
          }
        }

        // 正常更新样式
        this.module.updateStyle(selector, property, value);
        this.debounceTimers.delete(key);
      }, 300);

      this.debounceTimers.set(key, timer);
    }
  }

  /**
   * 注入额外的CSS
   */
  injectAdditionalCSS(selector, css) {
    const styleId = `ve-additional-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`;
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;
  }

  /**
   * 添加事件监听器
   */
  addListener(element, event, handler) {
    if (!this.changeListeners.has(element)) {
      this.changeListeners.set(element, []);
    }
    this.changeListeners.get(element).push({ event, handler });
  }

  /**
   * 解绑面板事件
   */
  unbindPanelEvents() {
    for (const [element, listeners] of this.changeListeners) {
      for (const { event, handler } of listeners) {
        element.removeEventListener(event, handler);
      }
    }
    this.changeListeners.clear();
  }

  /**
   * 清理
   */
  cleanup() {
    this.unbindPanelEvents();

    // 清除所有定时器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // 清除阴影缓存
    this.shadowDataCache.clear();

    // 清除条件显示缓存
    this.conditionalVisibility.clear();

    // 清除批量操作缓存
    this.batchOperationCache.clear();

    this.currentElement = null;
    this.batchMode = 'single';
  }
}


