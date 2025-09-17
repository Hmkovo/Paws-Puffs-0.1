/**
 * @装饰语法处理器 - 智能协调者模式
 * 
 * 核心功能：
 * - 解析和处理@装饰语法（如：@用户消息：光环）
 * - 动态创建DOM装饰元素并应用样式
 * - 智能协调器：实时检测、延时处理、状态指示
 * - 与css-enhance模块协调，避免重复监听冲突
 */

export class CSSPreprocessor {
  constructor(module) {
    this.module = module;
    this.decorationRules = new Map();
    this.appliedDecorations = new WeakMap();
    this.messageObserver = null;
    this.lastProcessedCSS = '';

    // 追踪所有装饰元素，方便清理
    this.allDecorationElements = new Set();

    // 智能装饰协调器 - 轻量协调者模式实现
    this.smartCoordinator = {
      initialized: false,           // ⚡ 防止重复初始化标志
      isActive: false,              // 是否处于智能模式
      timer: null,                  // 智能模式计时器
      editDetectionDelay: 3000,     // 3秒无操作后关闭智能模式
      cssChangeListener: null,      // CSS变化监听器
      lastProcessedContent: '',     // 上次处理的内容

      // 状态指示器元素
      statusIndicator: null,
      statusText: null,
      refreshButton: null
    };

    // ✅ 已删除重复的元素映射，统一使用format-parser的映射数据

  }

  init() {
    this.injectAnimations();
    // this.startObserving(); // 🗑️ 已删除：迁移到智能监听协调器

    // 🔧 智能协调器延迟初始化（UI创建后由主模块调用）
    // this.initSmartCoordinator(); // 将在UI渲染后调用
  }


  processCSS(cssText) {
    if (cssText === this.lastProcessedCSS) {
      return cssText;
    }

    this.lastProcessedCSS = cssText;

    // 保存旧规则用于对比
    const oldRules = new Map(this.decorationRules);

    // 清空当前规则
    this.decorationRules.clear();

    // 解析特殊语法 - 支持两种冒号
    const decorationPattern = /@([^:：{]+)[：:]([^{]+)\s*\{([^}]+)\}/g;
    let cleanCSS = cssText;
    let match;
    let ruleCount = 0;

    while ((match = decorationPattern.exec(cssText)) !== null) {
      const [fullMatch, elementName, decorationName, styleText] = match;

      const selector = this.resolveSelector(elementName.trim());
      const styles = this.parseStyles(styleText);
      const ruleId = `${elementName.trim()}-${decorationName.trim()}`;


      this.decorationRules.set(ruleId, {
        id: ruleId,
        selector: selector,
        elementName: elementName.trim(),
        decorationName: decorationName.trim(),
        styles: styles,
        className: `ve-decoration-${decorationName.trim().replace(/\s+/g, '-')}`
      });

      cleanCSS = cleanCSS.replace(fullMatch, '');
      ruleCount++;
    }

    // 关键修复：智能清理和应用装饰
    this.reconcileDecorations(oldRules);

    return cleanCSS;
  }

  /**
   * 智能协调装饰元素
   * 对比新旧规则，只删除不再需要的装饰，只添加新的装饰
   */
  reconcileDecorations(oldRules) {
    // 找出需要删除的规则（在旧规则中但不在新规则中）
    const toRemove = [];
    for (const [ruleId, rule] of oldRules) {
      if (!this.decorationRules.has(ruleId)) {
        toRemove.push(rule);
      }
    }

    // 找出需要添加的规则（在新规则中但不在旧规则中）
    const toAdd = [];
    for (const [ruleId, rule] of this.decorationRules) {
      if (!oldRules.has(ruleId)) {
        toAdd.push(rule);
      }
    }

    // 找出需要更新的规则（两边都有但样式改变了）
    const toUpdate = [];
    for (const [ruleId, rule] of this.decorationRules) {
      const oldRule = oldRules.get(ruleId);
      if (oldRule && JSON.stringify(oldRule.styles) !== JSON.stringify(rule.styles)) {
        toUpdate.push(rule);
      }
    }


    // 执行删除
    toRemove.forEach(rule => {
      this.removeDecoration(rule);
    });

    // 执行更新（先删除再添加）
    toUpdate.forEach(rule => {
      this.removeDecoration(rule);
      this.applyDecoration(rule);
    });

    // 执行添加
    toAdd.forEach(rule => {
      this.applyDecoration(rule);
    });
  }

  /**
   * 删除特定装饰
   */
  removeDecoration(rule) {
    // 查找并删除所有匹配的装饰元素
    const decorations = document.querySelectorAll(`.${rule.className}[data-decoration-id="${rule.id}"]`);
    decorations.forEach(el => {
      this.allDecorationElements.delete(el);
      el.remove();
    });

    // 清理WeakMap中的记录
    const elements = document.querySelectorAll(rule.selector);
    elements.forEach(element => {
      const decorations = this.appliedDecorations.get(element);
      if (decorations) {
        decorations.delete(rule.id);
        if (decorations.size === 0) {
          this.appliedDecorations.delete(element);
        }
      }
    });

  }

  resolveSelector(elementName) {
    // ✅ 使用统一的format-parser映射
    if (this.module.formatParser) {
      const selector = this.module.formatParser.getSelector(elementName);
      if (selector !== elementName) {
        return selector; // 找到了映射
      }
    }

    // 如果是CSS选择器格式，直接返回
    if (elementName.includes('.') || elementName.includes('#') || elementName.includes('[')) {
      return elementName;
    }

    // 默认作为类名处理
    return `.${elementName}`;
  }

  /**
   * 修复的样式解析方法
   */
  parseStyles(styleText) {
    const styles = {};

    // 分割样式声明（支持中文和英文分号）
    const declarations = styleText.split(/[;；\n]/);

    for (const declaration of declarations) {
      if (!declaration.trim()) continue;

      // 查找冒号位置（中文或英文）
      let colonIndex = declaration.indexOf(':');
      if (colonIndex === -1) {
        colonIndex = declaration.indexOf('：');
      }

      if (colonIndex === -1) continue;

      const prop = declaration.substring(0, colonIndex).trim();
      const value = declaration.substring(colonIndex + 1).trim();

      // 转换属性名和值
      const cssProp = this.translateProperty(prop);
      const cssValue = this.translateValue(value, cssProp);

      if (cssProp && cssValue) {
        styles[cssProp] = cssValue;
      }
    }

    return styles;
  }

  /**
   * 转换属性名（增强版）
   * 完整的属性映射
   */
  translateProperty(prop) {
    // ✅ 优先使用统一的format-parser映射
    if (this.module.formatParser) {
      const result = this.module.formatParser.getProperty(prop);
      if (result !== prop) {
        return result; // 找到了映射
      }
    }

    // 特殊的装饰语法专用属性（不在format-parser中）
    const decorationSpecificProps = {
      '是否超出父元素显示': 'decoration-overflow-mode',
      '超出父元素': 'decoration-overflow-mode'
    };

    if (decorationSpecificProps[prop]) {
      return decorationSpecificProps[prop];
    }

    // 检查是否已经是英文属性名
    if (/^[a-z-]+$/.test(prop)) {
      return prop;
    }

    console.warn(`[CSSPreprocessor] 未知属性: ${prop}`);
    return null;
  }

  /**
   * 转换属性值（完整版）
   * 处理所有CSS值的中文映射
   */
  translateValue(value, property) {
    // 处理"是否超出父元素显示"属性的特殊值
    if (property === 'decoration-overflow-mode') {
      if (value === '超出' || value === '允许超出' || value === '是') {
        return 'allow-overflow';
      }
      if (value === '不超出' || value === '限制' || value === '否') {
        return 'contain';
      }
      // 默认为不超出
      return 'contain';
    }

    // 处理content属性
    if (property === 'content') {
      // 如果是空字符串，返回 ''
      if (value === '' || value === '空' || value === '无') {
        return "''";
      }
      // 否则保持原样
      return value;
    }

    // 先处理单位
    let processedValue = value
      .replace(/像素/g, 'px')
      .replace(/百分比/g, '%')
      .replace(/百分号/g, '%')
      .replace(/秒/g, 's')
      .replace(/毫秒/g, 'ms')
      .replace(/度/g, 'deg');

    // 处理位置值（position属性）
    if (property === 'position') {
      const positionMap = {
        '绝对': 'absolute',
        '相对': 'relative',
        '固定': 'fixed',
        '静态': 'static',
        '粘性': 'sticky',
        '相对定位': 'relative',
        '绝对定位': 'absolute',
        '固定定位': 'fixed'
      };
      if (positionMap[processedValue]) {
        return positionMap[processedValue];
      }
    }

    // 处理背景重复值
    if (property === 'background-repeat') {
      const repeatMap = {
        '重复': 'repeat',
        '不重复': 'no-repeat',
        '横向重复': 'repeat-x',
        '纵向重复': 'repeat-y',
        '重复横向': 'repeat-x',
        '重复纵向': 'repeat-y',
        '空间': 'space',
        '圆形': 'round'
      };
      if (repeatMap[processedValue]) {
        return repeatMap[processedValue];
      }
    }

    // 处理背景大小值
    if (property === 'background-size') {
      const sizeMap = {
        '包含': 'contain',
        '覆盖': 'cover',
        '自动': 'auto',
        '原始': 'auto'
      };
      if (sizeMap[processedValue]) {
        return sizeMap[processedValue];
      }
      // 处理具体尺寸值（如"420像素 420像素"）
      // processedValue 已经处理了单位转换
      return processedValue;
    }

    // 处理背景位置值
    if (property === 'background-position') {
      const positionValueMap = {
        '居中': 'center',
        '中心': 'center',
        '左侧': 'left',
        '右侧': 'right',
        '顶部': 'top',
        '底部': 'bottom',
        '左上': 'left top',
        '右上': 'right top',
        '左下': 'left bottom',
        '右下': 'right bottom',
        '中上': 'center top',
        '中下': 'center bottom',
        '左中': 'left center',
        '右中': 'right center'
      };
      if (positionValueMap[processedValue]) {
        return positionValueMap[processedValue];
      }
      // 处理带像素值的位置（如"10像素 20像素"）
      return processedValue;
    }

    // 处理背景附着
    if (property === 'background-attachment') {
      const attachmentMap = {
        '固定': 'fixed',
        '滚动': 'scroll',
        '本地': 'local'
      };
      if (attachmentMap[processedValue]) {
        return attachmentMap[processedValue];
      }
    }

    // 处理交互值
    if (property === 'pointer-events') {
      const pointerMap = {
        '无': 'none',
        '自动': 'auto',
        '禁用': 'none',
        '启用': 'auto'
      };
      if (pointerMap[processedValue]) {
        return pointerMap[processedValue];
      }
    }

    // 处理变换值
    if (property === 'transform') {
      let transformValue = processedValue;
      // 处理旋转
      transformValue = transformValue.replace(/旋转\((.*?)\)/, 'rotate($1)');
      // 处理缩放
      transformValue = transformValue.replace(/缩放\((.*?)\)/, 'scale($1)');
      // 处理偏移/移动
      transformValue = transformValue.replace(/偏移\((.*?)\)/, 'translate($1)');
      transformValue = transformValue.replace(/移动\((.*?)\)/, 'translate($1)');
      // 处理倾斜
      transformValue = transformValue.replace(/倾斜\((.*?)\)/, 'skew($1)');
      return transformValue;
    }

    // 处理滤镜值
    if (property === 'filter') {
      let filterValue = processedValue;
      filterValue = filterValue.replace(/模糊\((.*?)\)/, 'blur($1)');
      filterValue = filterValue.replace(/亮度\((.*?)\)/, 'brightness($1)');
      filterValue = filterValue.replace(/对比度\((.*?)\)/, 'contrast($1)');
      filterValue = filterValue.replace(/灰度\((.*?)\)/, 'grayscale($1)');
      filterValue = filterValue.replace(/色相旋转\((.*?)\)/, 'hue-rotate($1)');
      filterValue = filterValue.replace(/饱和度\((.*?)\)/, 'saturate($1)');
      filterValue = filterValue.replace(/反转\((.*?)\)/, 'invert($1)');
      filterValue = filterValue.replace(/透明度\((.*?)\)/, 'opacity($1)');
      filterValue = filterValue.replace(/褐色\((.*?)\)/, 'sepia($1)');
      return filterValue;
    }

    // 处理颜色值
    if (processedValue.startsWith('rgb')) {
      return processedValue;
    }

    // 如果模块有格式解析器，使用它
    if (this.module.formatParser) {
      const result = this.module.formatParser.parseValue(processedValue, property);
      if (result) return result;
    }

    return processedValue;
  }

  /**
   * 应用所有当前规则的装饰
   */
  applyAllDecorations() {
    requestAnimationFrame(() => {
      this.decorationRules.forEach(rule => {
        this.applyDecoration(rule);
      });
    });
  }

  /**
   * 修复的装饰应用方法
   * 增强：根据"是否超出父元素显示"属性来决定父元素的处理方式
   */
  applyDecoration(rule) {
    const elements = document.querySelectorAll(rule.selector);

    elements.forEach(element => {
      const decorations = this.appliedDecorations.get(element) || new Set();

      if (decorations.has(rule.id)) {
        // 更新现有装饰
        const existingDecoration = element.querySelector(`.${rule.className}`);
        if (existingDecoration) {
          // 使用 setAttribute 设置样式，确保生效
          this.applyStylesToElement(existingDecoration, rule.styles);
        }
        return;
      }

      // 创建新装饰
      const decoration = this.createDecorationElement(rule);

      // 检查是否需要限制在父元素内
      // decoration-overflow-mode 是我们的自定义属性，不会真正应用到元素上
      const overflowMode = rule.styles['decoration-overflow-mode'] || 'contain';

      if (overflowMode === 'allow-overflow') {
        // 允许超出模式：
        // 1. 不设置父元素的 position: relative
        // 2. 确保父元素的 overflow 是 visible
        // 3. 装饰元素使用 position: absolute 但相对于最近的非static祖先定位

        // 确保父元素允许溢出显示
        element.style.overflow = 'visible';

        // 不修改父元素的position，让装饰元素能够超出

      } else {
        // 限制模式（默认）：装饰元素被限制在父元素内
        // 确保父元素可以包含绝对定位的子元素
        if (rule.styles.position === 'absolute' &&
          getComputedStyle(element).position === 'static') {
          element.style.position = 'relative';
        }

        // 设置 overflow: hidden 来真正裁剪超出的内容
        element.style.overflow = 'hidden';

      }

      element.appendChild(decoration);

      decorations.add(rule.id);
      this.appliedDecorations.set(element, decorations);

      // 添加到全局追踪集合
      this.allDecorationElements.add(decoration);

    });
  }

  /**
   * 修复的装饰元素创建方法
   * 增强：过滤掉内部控制属性，不应用到实际元素上
   */
  createDecorationElement(rule) {
    const decoration = document.createElement('div');
    decoration.className = `ve-decoration ${rule.className}`;
    decoration.dataset.decorationId = rule.id;
    decoration.dataset.decorationName = rule.decorationName;

    // 过滤掉内部控制属性，只应用实际的CSS属性
    const filteredStyles = {};
    for (const [prop, value] of Object.entries(rule.styles)) {
      // 跳过我们的自定义控制属性
      if (prop === 'decoration-overflow-mode') {
        continue;
      }
      filteredStyles[prop] = value;
    }

    // 使用改进的样式应用方法
    this.applyStylesToElement(decoration, filteredStyles);

    // 确保装饰不影响交互
    if (!filteredStyles['pointer-events']) {
      decoration.style.pointerEvents = 'none';
    }

    return decoration;
  }

  /**
   * 正确应用样式到元素
   */
  applyStylesToElement(element, styles) {
    // 清空现有样式
    element.style.cssText = '';

    // 逐个设置样式属性
    for (const [prop, value] of Object.entries(styles)) {
      try {
        // 将连字符属性转换为驼峰命名
        const camelProp = prop.replace(/-([a-z])/g, (match, p1) => p1.toUpperCase());

        // 设置样式
        element.style[camelProp] = value;

        // 验证样式是否生效
        if (!element.style[camelProp] && value) {
          // 如果驼峰命名不生效，尝试直接设置
          element.style.setProperty(prop, value);
        }
      } catch (e) {
        console.warn(`[CSSPreprocessor] 无法设置样式 ${prop}: ${value}`, e);
      }
    }

    // 总是设置pointer-events
    if (!styles['pointer-events']) {
      element.style.pointerEvents = 'none';
    }

  }

  /**
   * 🗑️ 已删除：startObserving - 迁移到智能监听协调器
   * 原功能：监听#chat聊天区，应用装饰到新消息
   * 新方案：将在SmartListenerCoordinator的使用者模式中统一管理
   */
  // startObserving() - 已删除，功能迁移到智能协调器

  processNewNodes(nodes) {
    requestAnimationFrame(() => {
      this.decorationRules.forEach(rule => {
        nodes.forEach(node => {
          if (node.matches && node.matches(rule.selector)) {
            const decorations = this.appliedDecorations.get(node) || new Set();
            if (!decorations.has(rule.id)) {
              const decoration = this.createDecorationElement(rule);

              // 检查溢出模式
              const overflowMode = rule.styles['decoration-overflow-mode'] || 'contain';

              if (overflowMode === 'allow-overflow') {
                // 允许超出
                node.style.overflow = 'visible';
              } else {
                // 限制在父元素内
                if (rule.styles.position === 'absolute' &&
                  getComputedStyle(node).position === 'static') {
                  node.style.position = 'relative';
                }
                // 设置 overflow: hidden 来真正裁剪超出的内容
                node.style.overflow = 'hidden';
              }

              node.appendChild(decoration);

              decorations.add(rule.id);
              this.appliedDecorations.set(node, decorations);

              // 添加到全局追踪集合
              this.allDecorationElements.add(decoration);
            }
          }
        });
      });
    });
  }

  injectAnimations() {
    if (document.getElementById('ve-decoration-animations')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 've-decoration-animations';
    style.textContent = `
      .ve-decoration {
        user-select: none;
        -webkit-user-select: none;
        box-sizing: border-box;
      }
      
      @keyframes glow {
        0%, 100% {
          opacity: 0.6;
          filter: brightness(1);
        }
        50% {
          opacity: 1;
          filter: brightness(1.2);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }
      
      @keyframes rotate {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      
      @keyframes float {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 清理所有装饰元素
   * 改进版：使用全局追踪集合确保完全清理
   */
  clearAllDecorations() {
    // 方法1：使用全局追踪集合
    this.allDecorationElements.forEach(el => {
      if (el && el.parentNode) {
        el.remove();
      }
    });
    this.allDecorationElements.clear();

    // 清空数据结构
    this.appliedDecorations = new WeakMap();
    this.decorationRules.clear();
  }


  destroy() {
    if (this.messageObserver) {
      this.messageObserver.disconnect();
      this.messageObserver = null;
    }

    this.clearAllDecorations();

    // 销毁智能协调器
    this.destroySmartCoordinator();

    const animStyle = document.getElementById('ve-decoration-animations');
    if (animStyle) {
      animStyle.remove();
    }

  }

  getStats() {
    return {
      rulesCount: this.decorationRules.size,
      decoratedElements: this.allDecorationElements.size,
      isObserving: this.messageObserver !== null,
      smartMode: this.smartCoordinator.isActive
    };
  }

  // =====================================
  // 智能装饰协调器 - 轻量协调者模式实现
  // =====================================

  /**
   * 初始化智能装饰协调器
   * 核心功能：监听CSS变化，智能检测@装饰语法编辑，按需激活实时处理
   */
  initSmartCoordinator() {

    // ⚡ 防止重复初始化（解决重复调用的代码负债）
    if (this.smartCoordinator.initialized) {
      return;
    }

    // 设置EventBus监听器
    this.setupEventListeners();

    // 绑定静态UI状态指示器
    const uiReady = this.bindStaticStatusIndicator();

    // 设置手动刷新按钮（仅在UI准备就绪时）
    if (uiReady) {
      this.setupRefreshButton();
    }

    // 标记已初始化
    this.smartCoordinator.initialized = true;

  }

  /**
   * 设置事件监听器 - 通过EventBus监听CSS变化
   * 与css-enhance的JavaScript提取功能协调工作
   */
  setupEventListeners() {
    if (!this.module.eventBus) {
      console.warn('[SmartCoordinator] EventBus不可用，降级到DOM监听模式');
      this.setupDOMListener();
      return;
    }

    // 监听CSS输入变化事件
    this.smartCoordinator.cssChangeListener = (data) => {
      this.handleCSSChange(data.cssText, data.source || 'unknown');
    };

    // 注册CSS变化监听器
    this.module.eventBus.on('css:input:change', this.smartCoordinator.cssChangeListener);

    // 监听visual editor的样式更新
    this.module.eventBus.on('styles:updated', (data) => {
      const customCSS = document.querySelector('#customCSS');
      if (customCSS && customCSS.value) {
        this.handleCSSChange(customCSS.value, 'visual-editor');
      }
    });

  }

  /**
   * 🗑️ 已删除：setupDOMListener - 迁移到智能监听协调器
   * 原功能：监听#customCSS输入框变化，检测@装饰语法
   * 新方案：将在SmartListenerCoordinator中统一管理输入框监听和CSS编译
   */
  // setupDOMListener() - 已删除，功能迁移到智能协调器

  /**
   * 处理CSS变化的核心方法
   * 智能检测@装饰语法，按需激活处理
   */
  handleCSSChange(cssText, source = 'unknown') {
    // 防止重复处理相同内容
    if (cssText === this.smartCoordinator.lastProcessedContent) {
      return;
    }

    // 检测是否包含@装饰语法
    if (this.hasDecorationSyntax(cssText)) {
      this.activateSmartMode(cssText);
    } else if (this.smartCoordinator.isActive) {
      // 如果当前是智能模式但没有装饰语法，开始倒计时关闭
      this.scheduleSmartModeDeactivation();
    }
  }

  /**
   * 检测CSS文本是否包含@装饰语法
   */
  hasDecorationSyntax(cssText) {
    const decorationPattern = /@([^:：{]+)[：:]([^{]+)\s*\{([^}]+)\}/;
    return decorationPattern.test(cssText);
  }

  /**
   * 激活智能模式
   * 立即处理装饰语法并更新UI状态
   */
  activateSmartMode(cssText) {
    // 清除之前的定时器
    if (this.smartCoordinator.timer) {
      clearTimeout(this.smartCoordinator.timer);
      this.smartCoordinator.timer = null;
    }

    // 激活智能模式
    if (!this.smartCoordinator.isActive) {
      this.smartCoordinator.isActive = true;
      this.updateStatusIndicator('active', '智能模式已激活');
    }

    // 延迟处理，让css-enhance的JavaScript提取先完成
    setTimeout(() => {
      this.processWithCoordination(cssText);
      this.smartCoordinator.lastProcessedContent = cssText;
    }, 200);

    // 设置自动关闭定时器
    this.scheduleSmartModeDeactivation();
  }

  /**
   * 安排智能模式自动关闭
   */
  scheduleSmartModeDeactivation() {
    // 清除之前的定时器
    if (this.smartCoordinator.timer) {
      clearTimeout(this.smartCoordinator.timer);
    }

    // 设置新的定时器
    this.smartCoordinator.timer = setTimeout(() => {
      this.deactivateSmartMode();
    }, this.smartCoordinator.editDetectionDelay);
  }

  /**
   * 关闭智能模式
   * 🎯 延时保护：检查并清理不匹配的装饰元素
   */
  deactivateSmartMode() {
    if (this.smartCoordinator.isActive) {
      this.smartCoordinator.isActive = false;
      this.updateStatusIndicator('inactive', '装饰管理待机');

      // 🎯 修复：延时清理逻辑增强，增加重试机制
      setTimeout(() => {
        const currentCSS = document.querySelector('#customCSS')?.value || '';
        const hasDecoSyntax = this.hasDecorationSyntax(currentCSS);
        const hasElements = this.allDecorationElements.size > 0;

        if (!hasDecoSyntax && hasElements) {
          this.clearAllDecorations();
          // 验证清理效果，如有残留则重试
          setTimeout(() => {
            if (this.allDecorationElements.size > 0) {
              this.clearAllDecorations();
            }
          }, 200);
        }
      }, 250);
    }

    if (this.smartCoordinator.timer) {
      clearTimeout(this.smartCoordinator.timer);
      this.smartCoordinator.timer = null;
    }
  }

  /**
   * 🖱️ 手动保护：智能清理检查
   * 根据装饰元素数量选择同步或异步清理策略
   */
  smartCleanupCheck(cssText) {
    const elementCount = this.allDecorationElements.size;

    if (elementCount === 0) {
      return 0; // 无元素，无需清理
    }

    if (!this.hasDecorationSyntax(cssText)) {
      if (elementCount <= 5) {
        // 同步清理：元素少，用户无感知
        this.clearAllDecorations();
        return elementCount;
      } else {
        // 异步清理：元素多，避免卡顿
        setTimeout(() => {
          const count = this.allDecorationElements.size;
          this.clearAllDecorations();
          this.updateStatusIndicator('success', `已清理${count}个元素`);
          setTimeout(() => {
            this.updateStatusIndicator('inactive', '装饰管理待机');
          }, 1500);
        }, 5);
        return -1; // 表示异步处理
      }
    }
    return 0; // 有装饰语法，无需清理
  }

  /**
   * 与css-enhance协调的CSS处理方法
   * 确保JavaScript提取功能正常工作
   */
  processWithCoordination(cssText) {
    try {
      // 调用现有的processCSS方法
      const result = this.processCSS(cssText);

      // 更新状态指示器
      this.updateStatusIndicator('processing', '装饰已更新');

      // 短暂显示成功状态，然后回到激活状态
      setTimeout(() => {
        if (this.smartCoordinator.isActive) {
          this.updateStatusIndicator('active', '智能模式激活中');
        }
      }, 1000);

      return result;
    } catch (error) {
      console.error('[SmartCoordinator] 装饰处理失败:', error);
      this.updateStatusIndicator('error', '装饰处理失败');

      // 显示错误状态后恢复
      setTimeout(() => {
        if (this.smartCoordinator.isActive) {
          this.updateStatusIndicator('active', '智能模式激活中');
        } else {
          this.updateStatusIndicator('inactive', '装饰管理待机');
        }
      }, 2000);
    }
  }

  /**
   * 绑定静态状态指示器元素
   * 查找并绑定UI渲染时创建的静态元素
   */
  bindStaticStatusIndicator() {
    // 查找静态创建的元素
    this.smartCoordinator.statusIndicator = document.getElementById('smart-mode-indicator');
    this.smartCoordinator.statusText = document.getElementById('smart-mode-text');
    this.smartCoordinator.refreshButton = document.getElementById('refresh-decorations');

    // 验证元素是否存在
    if (!this.smartCoordinator.statusIndicator || !this.smartCoordinator.statusText || !this.smartCoordinator.refreshButton) {
      console.warn('[SmartCoordinator] 静态状态指示器元素未找到，智能协调器UI不可用');
      return false;
    }

    // 设置初始状态
    this.updateStatusIndicator('inactive', '装饰管理待机');
    return true;
  }

  /**
   * 设置手动刷新按钮
   * 提供备用的手动刷新机制
   */
  setupRefreshButton() {
    if (!this.smartCoordinator.refreshButton) {
      console.warn('[SmartCoordinator] 刷新按钮不可用');
      return;
    }

    this.smartCoordinator.refreshButton.addEventListener('click', () => {
      const customCSS = document.querySelector('#customCSS');
      if (customCSS && customCSS.value) {
        // 🎯 智能清理检查
        const cleanupCount = this.smartCleanupCheck(customCSS.value);

        if (cleanupCount > 0) {
          // 🔧 修复：验证清理效果，确保清理真正生效
          const actualRemaining = this.allDecorationElements.size;
          if (actualRemaining === 0) {
            this.updateStatusIndicator('success', `已清理${cleanupCount}个元素`);
          } else {
            // 清理未完全生效，强制再次清理
            this.clearAllDecorations();
            this.updateStatusIndicator('success', `已强制清理所有装饰元素`);
          }
          setTimeout(() => {
            this.updateStatusIndicator('inactive', '装饰管理待机');
          }, 1500);
        } else if (cleanupCount === -1) {
          // 异步处理中，不需要额外操作
        } else {
          // 正常刷新处理
          const wasActive = this.smartCoordinator.isActive;
          this.activateSmartMode(customCSS.value);

          if (!wasActive) {
            setTimeout(() => this.deactivateSmartMode(), 2000);
          }
        }
      } else {
        this.updateStatusIndicator('warning', '输入框为空');
        setTimeout(() => {
          this.updateStatusIndicator('inactive', '装饰管理待机');
        }, 1500);
      }
    });
  }

  /**
   * 更新状态指示器显示
   */
  updateStatusIndicator(status, text) {
    if (!this.smartCoordinator.statusIndicator || !this.smartCoordinator.statusText) {
      return;
    }

    // 移除所有状态类
    this.smartCoordinator.statusIndicator.className = 'fa fa-circle';

    // 添加对应的状态类和文本
    switch (status) {
      case 'active':
        this.smartCoordinator.statusIndicator.classList.add('text-success');
        break;
      case 'processing':
        this.smartCoordinator.statusIndicator.classList.add('text-info');
        break;
      case 'error':
        this.smartCoordinator.statusIndicator.classList.add('text-danger');
        break;
      case 'warning':
        this.smartCoordinator.statusIndicator.classList.add('text-warning');
        break;
      case 'inactive':
      default:
        this.smartCoordinator.statusIndicator.classList.add('text-muted');
        break;
    }

    this.smartCoordinator.statusText.textContent = text;
  }

  /**
   * 销毁智能协调器
   * 清理所有监听器和UI元素
   */
  destroySmartCoordinator() {

    // 清理定时器
    if (this.smartCoordinator.timer) {
      clearTimeout(this.smartCoordinator.timer);
      this.smartCoordinator.timer = null;
    }

    // 清理EventBus监听器
    if (this.module.eventBus && this.smartCoordinator.cssChangeListener) {
      this.module.eventBus.off('css:input:change', this.smartCoordinator.cssChangeListener);
      this.module.eventBus.off('styles:updated');
    }

    // 清理UI元素
    const statusContainer = document.querySelector('.decoration-smart-status');
    if (statusContainer) {
      statusContainer.remove();
    }

    // 重置状态
    this.smartCoordinator.initialized = false; // ⚡ 允许重新初始化
    this.smartCoordinator.isActive = false;
    this.smartCoordinator.cssChangeListener = null;
    this.smartCoordinator.statusIndicator = null;
    this.smartCoordinator.statusText = null;
    this.smartCoordinator.refreshButton = null;

  }




  /**
   * 防抖工具函数
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