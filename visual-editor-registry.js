/**
 * 元素注册中心 - UI元素定义管理器
 * 
 * 核心功能：
 * - 管理所有可编辑UI元素的定义和分类
 * - 提供图标组功能，批量管理相关元素
 * - 元素属性配置和快速查找接口
 * - 支持动态元素注册和分组管理
 */

export class VisualEditorRegistry {
  constructor(module) {
    this.module = module;

    // 元素注册表
    this.elements = new Map();

    // 分类索引
    this.categories = new Map();

    // 控件类型注册表
    this.controlTypes = new Map();

    // 元素回调处理器
    this.elementCallbacks = new Map();

    // 标记是否已注入toggle样式（避免重复注入）
    this.toggleStyleInjected = false;

    // 图标组注册表（新增）
    this.iconGroups = {};

    // 批量操作历史（新增）
    this.batchOperationHistory = [];

    // 初始化基础控件类型
    this.initBaseControlTypes();
  }

  /**
   * 初始化基础控件类型
   */
  initBaseControlTypes() {
    // 注册基础控件
    this.registerControlType('color', {
      render: (property, value, config) => this.renderColorControl(property, value, config),
      getValue: (element) => element.value,
      setValue: (element, value) => { element.value = value; }
    });

    this.registerControlType('slider', {
      render: (property, value, config) => this.renderSliderControl(property, value, config),
      getValue: (element) => element.value + (config.unit || ''),
      setValue: (element, value) => {
        const num = parseFloat(value) || 0;
        element.value = num;
      }
    });

    this.registerControlType('select', {
      render: (property, value, config) => this.renderSelectControl(property, value, config),
      getValue: (element) => element.value,
      setValue: (element, value) => { element.value = value; }
    });

    this.registerControlType('text', {
      render: (property, value, config) => this.renderTextControl(property, value, config),
      getValue: (element) => element.value,
      setValue: (element, value) => { element.value = value; }
    });

    // 添加toggle控件类型支持
    this.registerControlType('toggle', {
      render: (property, value, config) => this.renderToggleControl(property, value, config),
      getValue: (element, config) => element.checked ? (config.onValue || 'on') : (config.offValue || 'off'),
      setValue: (element, value, config) => {
        element.checked = value === (config.onValue || 'on');
      }
    });

    this.registerControlType('number', {
      render: (property, value, config) => this.renderNumberControl(property, value, config),
      getValue: (element) => element.value + (config.unit || ''),
      setValue: (element, value) => {
        const num = parseFloat(value) || 0;
        element.value = num;
      }
    });
  }

  /**
   * 注册元素（增强版，支持onStyleApply回调和组ID）
   */
  registerElement(elementConfig) {
    const { selector, category = 'other', onStyleApply, groupId, subGroupId } = elementConfig;

    if (!selector) {
      console.error('[Registry] 元素必须有selector');
      return false;
    }

    // 添加组信息到元素配置
    if (groupId) {
      elementConfig.groupId = groupId;
    }
    if (subGroupId) {
      elementConfig.subGroupId = subGroupId;
    }

    // 添加到元素表
    this.elements.set(selector, elementConfig);

    // 如果有onStyleApply回调，保存到回调表
    if (onStyleApply && typeof onStyleApply === 'function') {
      this.elementCallbacks.set(selector, onStyleApply);
    }

    // 更新分类索引
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category).add(selector);

    return true;
  }

  /**
   * 批量注册元素
   */
  registerElements(elements) {
    elements.forEach(element => this.registerElement(element));
  }

  /**
   * 注册图标组（新增）
   * @param {Object} groups - 图标组定义
   */
  registerIconGroups(groups) {
    this.iconGroups = groups;
  }

  /**
   * 获取图标组信息（新增）
   * @param {string} groupId - 组ID
   * @returns {Object} 组信息
   */
  getIconGroup(groupId) {
    return this.iconGroups[groupId];
  }

  /**
   * 获取组内所有元素（新增）
   * @param {string} groupId - 组ID
   * @returns {Array} 元素数组
   */
  getGroupElements(groupId) {
    const elements = [];
    for (const [selector, element] of this.elements) {
      if (element.groupId === groupId) {
        elements.push(element);
      }
    }
    return elements;
  }

  /**
   * 获取子组元素（新增）
   * @param {string} subGroupId - 子组ID
   * @returns {Array} 元素数组
   */
  getSubGroupElements(groupId, subGroupId) {
    const elements = [];
    for (const [selector, element] of this.elements) {
      if (element.groupId === groupId && element.subGroupId === subGroupId) {
        elements.push(element);
      }
    }
    return elements;
  }

  /**
     * 批量应用样式到组（修正版）
     * @param {string} groupId - 组ID
     * @param {Object} styles - 样式对象 {property: value}
     * @param {Object} options - 选项（如：alternating模式）
     */
  applyToGroup(groupId, styles, options = {}) {
    const elements = this.getGroupElements(groupId);
    const results = [];

    // 开始批量应用

    elements.forEach((element, index) => {
      // 处理交替模式
      let actualStyles = styles;
      if (options.alternating && options.oddStyles && options.evenStyles) {
        // 修正：导航栏图标的索引计算（9个图标：0-8）
        // 偶数索引（0,2,4,6,8）使用evenStyles
        // 奇数索引（1,3,5,7）使用oddStyles
        actualStyles = (index % 2 === 0) ? options.evenStyles : options.oddStyles;
      }

      // 确保actualStyles存在且是对象
      if (actualStyles && typeof actualStyles === 'object') {
        // 调用元素的onStyleApply回调
        const callback = this.elementCallbacks.get(element.selector);
        if (callback) {
          for (const [property, value] of Object.entries(actualStyles)) {
            const result = callback(element.selector, property, value);

            // 🔧 处理回调返回的additionalCSS（重要！）
            if (result && result.additionalCSS) {
              // 让主模块处理additionalCSS，整合到中文格式系统中
              if (this.module.applyAdditionalCSS) {
                this.module.applyAdditionalCSS(result.additionalCSS);
              } else {
                // 备用方案：添加到独立样式元素
                this.addAdditionalCSS(result.additionalCSS);
              }
            }

            // 🔧 处理回调返回的additionalStyles
            if (result && result.additionalStyles) {
              // 将additionalStyles也更新到pendingStyles
              for (const [addProp, addValue] of Object.entries(result.additionalStyles)) {
                this.module.updateStyle(element.selector, addProp, addValue);
              }
            }

            // 同时更新原始属性到module的pendingStyles
            this.module.updateStyle(element.selector, property, value);

            results.push({
              selector: element.selector,
              property,
              value,
              success: !!result,
              pattern: options.alternating ? (index % 2 === 0 ? 'even' : 'odd') : 'uniform'
            });
          }
        }
      }
    });

    // 记录批量操作历史
    this.batchOperationHistory.push({
      timestamp: Date.now(),
      groupId,
      styles,
      options,
      results
    });

    // ✅ 直接应用到CSS输入框 - 使用原生实时预览
    this.module.applyStylesToCSS();

    return results;
  }

  /**
   * 复制元素样式到组（新增）
   * @param {string} sourceSelector - 源元素选择器
   * @param {string} groupId - 目标组ID
   */
  copyStylesToGroup(sourceSelector, groupId) {
    const sourceElement = document.querySelector(sourceSelector);
    if (!sourceElement || !sourceElement._iconData) {
      console.warn('[Registry] 源元素没有样式数据');
      return false;
    }

    const sourceData = sourceElement._iconData;
    const elements = this.getGroupElements(groupId);
    const results = [];

    elements.forEach(element => {
      const callback = this.elementCallbacks.get(element.selector);
      if (callback) {
        // 应用每个属性
        for (const [prop, val] of Object.entries(sourceData)) {
          callback(element.selector, prop, val);
        }
        results.push({
          selector: element.selector,
          success: true
        });
      }
    });

    return results;
  }

  /**
   * 获取批量操作历史（新增）
   * @param {number} limit - 限制数量
   * @returns {Array} 历史记录
   */
  getBatchOperationHistory(limit = 10) {
    return this.batchOperationHistory.slice(-limit);
  }

  /**
   * 注销元素
   */
  unregisterElement(selector) {
    const element = this.elements.get(selector);
    if (element) {
      // 从分类中移除
      const category = element.category || 'other';
      const categorySet = this.categories.get(category);
      if (categorySet) {
        categorySet.delete(selector);
        if (categorySet.size === 0) {
          this.categories.delete(category);
        }
      }

      // 从元素表移除
      this.elements.delete(selector);

      // 从回调表移除
      this.elementCallbacks.delete(selector);

      return true;
    }
    return false;
  }

  /**
   * 获取元素配置
   */
  getElement(selector) {
    return this.elements.get(selector);
  }

  /**
   * 获取元素的onStyleApply回调
   */
  getElementCallback(selector) {
    return this.elementCallbacks.get(selector);
  }

  /**
   * 执行元素的onStyleApply回调
   */
  applyElementStyle(selector, property, value) {
    const callback = this.elementCallbacks.get(selector);
    if (callback) {
      const result = callback(selector, property, value);
      if (result) {
        return result;
      }
    }
    return null;
  }

  /**
   * 执行元素的onStyleClear回调（新增统一清除方法）
   */
  clearElementStyle(selector) {
    const element = this.elements.get(selector);
    if (element && element.onStyleClear) {
      try {
        const result = element.onStyleClear(selector);
        return result;
      } catch (error) {
        console.error(`[Registry] 清除回调执行失败: ${selector}`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * 添加额外CSS到页面（用于处理回调返回的additionalCSS）
   */
  addAdditionalCSS(cssText) {
    if (!cssText || typeof cssText !== 'string') return;

    // 创建或获取专用的style元素
    let styleElement = document.getElementById('ve-additional-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 've-additional-styles';
      styleElement.setAttribute('data-source', 'visual-editor-registry');
      document.head.appendChild(styleElement);
    }

    // 添加新的CSS到现有内容中（避免覆盖）
    const currentCSS = styleElement.textContent || '';
    if (!currentCSS.includes(cssText.trim())) {
      styleElement.textContent = currentCSS + '\n' + cssText;
    }
  }

  /**
   * 获取所有元素
   */
  getAllElements() {
    return Array.from(this.elements.values());
  }

  /**
   * 按分类获取元素
   */
  getElementsByCategory(category) {
    const selectors = this.categories.get(category);
    if (!selectors) return [];

    return Array.from(selectors).map(selector => this.elements.get(selector));
  }

  /**
   * 获取所有分类
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * 注册控件类型
   */
  registerControlType(type, handler) {
    this.controlTypes.set(type, handler);
  }

  /**
   * 获取控件处理器
   */
  getControlHandler(type) {
    return this.controlTypes.get(type);
  }

  /**
   * 渲染控件
   */
  renderControl(type, property, value, config) {
    const handler = this.controlTypes.get(type);
    if (!handler) {
      console.warn(`[Registry] 未知控件类型: ${type}`);
      return this.renderTextControl(property, value, config);
    }
    return handler.render(property, value, config);
  }

  // ========== 基础控件渲染方法 ==========

  /**
   * 渲染颜色控件
   */
  renderColorControl(property, value, config) {
    const id = `ve-${property}-${Date.now()}`;
    const hint = config.hint ? `<span class="ve-hint">${config.hint}</span>` : '';

    return `
      <div class="ve-control-item ve-color-control">
        <label for="${id}">${config.label}</label>
        ${hint}
        <div class="ve-color-input">
          <input type="color" 
                 id="${id}"
                 data-property="${property}"
                 value="${this.normalizeColor(value || config.defaultValue)}"
                 class="ve-control-color">
          <input type="text" 
                 data-property="${property}"
                 value="${value || config.defaultValue || ''}"
                 placeholder="${config.placeholder || '#000000'}"
                 class="ve-control-color-text">
          <button class="ve-btn-small ve-clear-btn" data-property="${property}">×</button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染滑块控件
   */
  renderSliderControl(property, value, config) {
    const id = `ve-${property}-${Date.now()}`;
    const numValue = parseFloat(value) || config.defaultValue || 0;
    const hint = config.hint ? `<span class="ve-hint">${config.hint}</span>` : '';

    return `
      <div class="ve-control-item ve-slider-control">
        <label for="${id}">${config.label}</label>
        ${hint}
        <div class="ve-slider-input">
          <input type="range" 
                 id="${id}"
                 data-property="${property}"
                 min="${config.min || 0}"
                 max="${config.max || 100}"
                 step="${config.step || 1}"
                 value="${numValue}"
                 class="ve-control-slider">
          <input type="number"
                 data-property="${property}"
                 min="${config.min || 0}"
                 max="${config.max || 100}"
                 step="${config.step || 1}"
                 value="${numValue}"
                 class="ve-control-number">
          <span>${config.unit || ''}</span>
        </div>
      </div>
    `;
  }

  /**
   * 渲染选择控件
   */
  renderSelectControl(property, value, config) {
    const id = `ve-${property}-${Date.now()}`;
    const options = config.options || [];
    const hint = config.hint ? `<span class="ve-hint">${config.hint}</span>` : '';

    return `
      <div class="ve-control-item ve-select-control">
        <label for="${id}">${config.label}</label>
        ${hint}
        <select id="${id}" 
                data-property="${property}"
                class="ve-control-select">
          ${options.map(opt => `
            <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
              ${opt.label}
            </option>
          `).join('')}
        </select>
      </div>
    `;
  }

  /**
   * 渲染文本控件
   */
  renderTextControl(property, value, config) {
    const id = `ve-${property}-${Date.now()}`;
    const hint = config.hint ? `<span class="ve-hint">${config.hint}</span>` : '';

    return `
      <div class="ve-control-item ve-text-control">
        <label for="${id}">${config.label}</label>
        ${hint}
        <input type="text" 
               id="${id}"
               data-property="${property}"
               value="${value || config.defaultValue || ''}"
               placeholder="${config.placeholder || ''}"
               class="ve-control-text">
      </div>
    `;
  }

  /**
   * 渲染数字控件
   */
  renderNumberControl(property, value, config) {
    const id = `ve-${property}-${Date.now()}`;
    const numValue = parseFloat(value) || config.defaultValue || 0;
    const hint = config.hint ? `<span class="ve-hint">${config.hint}</span>` : '';

    return `
      <div class="ve-control-item ve-number-control">
        <label for="${id}">${config.label}</label>
        ${hint}
        <div class="ve-number-input">
          <input type="number" 
                 id="${id}"
                 data-property="${property}"
                 min="${config.min}"
                 max="${config.max}"
                 step="${config.step || 1}"
                 value="${numValue}"
                 class="ve-control-number">
          <span>${config.unit || ''}</span>
        </div>
      </div>
    `;
  }

  /**
   * 渲染开关控件（修复版 - 使用原生勾选框）
   */
  renderToggleControl(property, value, config) {
    const id = `ve-${property}-${Date.now()}`;
    const checked = value === config.onValue || (config.defaultValue && value === undefined);
    const hint = config.hint ? `<span class="ve-hint">${config.hint}</span>` : '';

    // 只注入一次样式，避免重复
    if (!this.toggleStyleInjected) {
      this.injectToggleStyles();
      this.toggleStyleInjected = true;
    }

    return `
      <div class="ve-control-item ve-toggle-control">
        <label class="ve-toggle-label">
          <input type="checkbox" 
                 id="${id}"
                 data-property="${property}"
                 data-on-value="${config.onValue || 'on'}"
                 data-off-value="${config.offValue || 'off'}"
                 ${checked ? 'checked' : ''}
                 class="ve-control-toggle-checkbox">
          <span class="ve-toggle-text">${config.label}</span>
        </label>
        ${hint}
      </div>
    `;
  }

  /**
   * 注入toggle样式（只执行一次）
   */
  injectToggleStyles() {
    // 检查是否已存在
    if (document.getElementById('ve-toggle-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 've-toggle-styles';
    style.textContent = `
      .ve-toggle-control {
        margin: 10px 0;
      }
      .ve-toggle-label {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      .ve-control-toggle-checkbox {
        /* 显示原生勾选框 */
        display: inline-block;
        margin-right: 8px;
        cursor: pointer;
      }
      .ve-toggle-text {
        user-select: none;
        font-size: 0.85em;
      }
      .ve-hint {
        display: block;
        font-size: 11px;
        color: #666;
        margin-top: 4px;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 工具方法：规范化颜色
   */
  normalizeColor(color) {
    if (!color || color === 'transparent') return '#ffffff';
    if (color.startsWith('#')) return color;
    if (color.startsWith('rgb')) {
      // 简单的RGB转HEX（完整版）
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return '#' + [r, g, b].map(x => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        }).join('');
      }
    }
    return '#000000';
  }

  /**
   * 搜索元素
   */
  searchElements(keyword) {
    const results = [];
    const lower = keyword.toLowerCase();

    for (const element of this.elements.values()) {
      if (element.displayName.toLowerCase().includes(lower) ||
        element.selector.toLowerCase().includes(lower)) {
        results.push(element);
      }
    }

    return results;
  }

  /**
   * 处理复杂样式组合（新增）
   * 用于处理像阴影这样需要多个属性组合的情况
   */
  combineComplexStyles(selector, propertyGroup, values) {
    // 阴影组合处理
    if (propertyGroup === 'shadow') {
      const shadowData = {
        x: values['shadow-x'] || 0,
        y: values['shadow-y'] || 2,
        blur: values['shadow-blur'] || 4,
        spread: values['shadow-spread'] || 0,
        color: values['shadow-color'] || 'rgba(0,0,0,0.2)',
        enabled: values['shadow-enabled'] === 'enabled'
      };

      if (shadowData.enabled) {
        return {
          'box-shadow': `${shadowData.x}px ${shadowData.y}px ${shadowData.blur}px ${shadowData.spread}px ${shadowData.color}`
        };
      } else {
        return {
          'box-shadow': 'none'
        };
      }
    }

    return null;
  }

  /**
   * 获取统计信息（增强版）
   */
  getStats() {
    // 统计图标组信息
    const iconGroupStats = {};
    for (const [groupId, group] of Object.entries(this.iconGroups)) {
      const elements = this.getGroupElements(groupId);
      iconGroupStats[groupId] = {
        name: group.name,
        count: elements.length,
        hasSubGroups: !!group.subGroups
      };
    }

    return {
      totalElements: this.elements.size,
      categories: this.categories.size,
      controlTypes: this.controlTypes.size,
      elementsWithCallbacks: this.elementCallbacks.size,
      iconGroups: Object.keys(this.iconGroups).length,
      iconGroupStats,
      batchOperations: this.batchOperationHistory.length,
      categoryBreakdown: Array.from(this.categories.entries()).map(([cat, set]) => ({
        category: cat,
        count: set.size
      }))
    };
  }

  /**
   * 调试方法：打印注册信息
   */
  debug() {
    // 调试信息已简化 - 减少生产环境日志输出


  }
}