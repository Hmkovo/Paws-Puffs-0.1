/**
 * 可视化CSS编辑器生成器模块（修复版）
 * 功能：将编辑器配置生成优化的CSS代码
 * 
 * 创建时间：2025-09-06
 * 修复时间：2025-09-07 - 修复generateHeader方法的参数问题
 */

export class VisualEditorGenerator {
  constructor(module) {
    this.module = module;

    // CSS生成配置
    this.config = {
      minify: false,              // 是否压缩
      useImportant: true,         // 是否添加!important
      groupBySelector: true,      // 按选择器分组
      sortProperties: true,       // 排序属性
      addComments: true,          // 添加注释
      indentSize: 2              // 缩进大小
    };

    // 属性排序顺序
    this.propertyOrder = [
      // 布局
      'position', 'top', 'right', 'bottom', 'left', 'z-index',
      'display', 'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
      'grid', 'grid-template-columns', 'grid-template-rows', 'gap',
      'float', 'clear',

      // 盒模型
      'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',

      // 边框
      'border', 'border-width', 'border-style', 'border-color',
      'border-top', 'border-right', 'border-bottom', 'border-left',
      'border-radius', 'border-top-left-radius', 'border-top-right-radius',
      'border-bottom-left-radius', 'border-bottom-right-radius',
      'outline', 'outline-width', 'outline-style', 'outline-color',

      // 背景
      'background', 'background-color', 'background-image', 'background-repeat',
      'background-position', 'background-size', 'background-attachment',

      // 文字
      'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
      'line-height', 'letter-spacing', 'text-align', 'text-decoration',
      'text-transform', 'white-space', 'word-break', 'word-spacing',

      // 效果
      'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
      'box-shadow', 'text-shadow',
      'transform', 'transition', 'animation',
      'filter', 'backdrop-filter',

      // 其他
      'cursor', 'user-select', 'pointer-events'
    ];
  }

  /**
   * 预处理头像布局属性
   * 将头像元素拆分为容器(布局)和图片(样式)两套规则
   * 挤压模式会生成额外的消息容器CSS规则
   */
  preprocessAvatarLayout(styleRules) {
    const processedRules = new Map();

    for (const [selector, properties] of styleRules) {
      // 检查是否为头像选择器
      if (this.isAvatarSelector(selector)) {
        // 🎯 分离属性：布局 vs 样式
        const { layoutProps, styleProps } = this.separateAvatarProperties(properties);

        // 检查是否为挤压模式，需要生成消息容器CSS
        const layoutMode = layoutProps['avatar-layout-mode'];
        const position = layoutProps['avatar-position'];

        // 🔥 处理"无"布局模式 - 跳过所有布局CSS生成
        if (layoutMode === 'none') {
          // 只处理样式属性，不生成任何布局CSS
          if (Object.keys(styleProps).length > 0) {
            const imgSelector = selector + ' img';
            processedRules.set(imgSelector, styleProps);
          }
          continue; // 跳过布局处理
        }

        if (layoutMode === 'squeeze' && position) {
          // 🔥 挤压模式：生成消息容器(.mes)的布局CSS
          const messageContainerCSS = this.generateSqueezeContainerCSS(position);
          const messageSelector = this.getMessageContainerSelector(selector);
          processedRules.set(messageSelector, messageContainerCSS);

          // 🔥 生成头像包装器的order CSS（如果需要重新排序）
          const avatarWrapperCSS = this.generateAvatarWrapperOrderCSS(position);
          if (Object.keys(avatarWrapperCSS).length > 0) {
            const wrapperSelector = messageSelector + ' > .mesAvatarWrapper';
            processedRules.set(wrapperSelector, avatarWrapperCSS);
          }
        }

        // 1. 处理布局属性 - 作用于.avatar容器
        if (Object.keys(layoutProps).length > 0) {
          const layoutCSS = this.generateAvatarLayoutCSS(layoutProps);

          // 移除特殊布局属性
          delete layoutProps['avatar-layout-mode'];
          delete layoutProps['avatar-position'];
          delete layoutProps['avatar-offset-x'];
          delete layoutProps['avatar-offset-y'];
          delete layoutProps['avatar-rotate'];

          // 合并生成的布局CSS
          Object.assign(layoutProps, layoutCSS);

          // 🔥 修复：确保至少有生成的CSS规则被添加
          if (Object.keys(layoutProps).length > 0 || Object.keys(layoutCSS).length > 0) {
            // 如果layoutProps被清空但有生成的CSS，直接使用生成的CSS
            const finalProps = Object.keys(layoutProps).length > 0 ? layoutProps : layoutCSS;
            processedRules.set(selector, finalProps);
          }
        }

        // 2. 处理样式属性 - 作用于.avatar img
        if (Object.keys(styleProps).length > 0) {
          const imgSelector = selector + ' img';
          processedRules.set(imgSelector, styleProps);
        }

      } else {
        // 非头像元素直接复制
        processedRules.set(selector, properties);
      }
    }

    return processedRules;
  }

  /**
   * 🎯 预处理信息显示布局 - 删除虚拟组，只处理单个元素
   * 按用户要求：全部使用单个元素控制，删除组设计
   */
  preprocessInfoLayout(styleRules) {
    const processedRules = new Map();

    for (const [selector, properties] of styleRules) {
      // 检查是否为单个信息元素选择器
      if (this.isInfoElementSelector(selector)) {
        // 🔥 处理单个信息元素的布局
        const { layoutProps, styleProps } = this.separateInfoProperties(properties);
        const layoutMode = layoutProps['info-layout-mode'];

        if (layoutMode === 'none') {
          // 只处理样式属性
          if (Object.keys(styleProps).length > 0) {
            processedRules.set(selector, styleProps);
          }
        } else if (layoutMode && layoutProps['info-position']) {
          // 生成单个元素的布局CSS
          const elementCSS = this.generateInfoElementCSS(layoutProps, selector);

          // 生成容器CSS（如果是挤压模式）
          if (layoutMode === 'squeeze') {
            const messageContainerCSS = this.generateInfoSqueezeContainerCSS(layoutProps['info-position']);
            const messageSelector = this.getMessageContainerSelector(selector);
            processedRules.set(messageSelector, messageContainerCSS);
          }

          // 合并布局CSS和样式CSS
          const finalCSS = Object.assign({}, elementCSS, styleProps);
          if (Object.keys(finalCSS).length > 0) {
            processedRules.set(selector, finalCSS);
          }
        } else {
          // 只有样式属性，直接设置
          if (Object.keys(styleProps).length > 0) {
            processedRules.set(selector, styleProps);
          }
        }
      } else {
        // 非信息显示相关选择器，直接复制
        processedRules.set(selector, properties);
      }
    }

    return processedRules;
  }

  /**
   * 分离头像属性：布局属性 vs 样式属性
   */
  separateAvatarProperties(properties) {
    const layoutProps = {};
    const styleProps = {};

    // 布局相关属性（作用于.avatar容器）
    const layoutAttributes = [
      'avatar-layout-mode', 'avatar-position', 'avatar-offset-x',
      'avatar-offset-y', 'avatar-rotate', 'position', 'top', 'right',
      'bottom', 'left', 'z-index', 'transform', 'margin', 'margin-top',
      'margin-right', 'margin-bottom', 'margin-left'
    ];

    // 样式相关属性（作用于.avatar img）
    const styleAttributes = [
      'width', 'height', 'border-radius', 'border', 'border-width',
      'border-style', 'border-color', 'box-shadow', 'opacity', 'filter'
    ];

    for (const [prop, value] of Object.entries(properties)) {
      if (layoutAttributes.includes(prop)) {
        layoutProps[prop] = value;
      } else if (styleAttributes.includes(prop)) {
        styleProps[prop] = value;
      } else {
        // 默认放到样式属性中
        styleProps[prop] = value;
      }
    }

    return { layoutProps, styleProps };
  }

  /**
   * 检查是否为头像选择器
   */
  isAvatarSelector(selector) {
    return selector.includes('.avatar') &&
      (selector.includes('is_user="true"') || selector.includes('is_user="false"'));
  }

  /**
   * 生成头像布局CSS
   * 智能分离容器CSS和图片CSS
   */
  generateAvatarLayoutCSS(properties) {
    const layoutMode = properties['avatar-layout-mode'];
    const position = properties['avatar-position'];
    const offsetX = properties['avatar-offset-x'] || '0px';
    const offsetY = properties['avatar-offset-y'] || '0px';
    const rotate = properties['avatar-rotate'] || '0deg';

    const css = {};

    // 🎯 布局相关属性：作用于.avatar容器
    if (layoutMode === 'overlay') {
      // 悬浮模式：绝对定位，不影响文本布局
      css.position = 'absolute';
      css['z-index'] = '10';

      // 根据位置设置定位
      const positions = this.getOverlayPositions(position, offsetX, offsetY);
      Object.assign(css, positions);

    } else if (layoutMode === 'squeeze') {
      // 挤压模式：影响文本布局
      css.position = 'static';

      // 根据位置设置flex布局（包括偏移处理）
      const flexProps = this.getSqueezePositions(position, offsetX, offsetY);
      Object.assign(css, flexProps);
    }

    // 应用旋转（特别处理挤压模式的transform重置）
    if (layoutMode === 'squeeze') {
      // 🔥 挤压模式：显式重置transform，然后应用旋转
      if (rotate !== '0deg') {
        css.transform = `rotate(${rotate})`;
      } else {
        css.transform = 'none';  // 重置transform
      }
    } else if (rotate !== '0deg') {
      // 悬浮模式：累加transform
      css.transform = css.transform ? `${css.transform} rotate(${rotate})` : `rotate(${rotate})`;
    }

    return css;
  }

  /**
   * 获取悬浮模式的定位CSS
   */
  getOverlayPositions(position, offsetX, offsetY) {
    const positions = {};

    switch (position) {
      case 'top-left':
        positions.top = `calc(-30px + ${offsetY})`;
        positions.left = `calc(0px + ${offsetX})`;
        break;
      case 'top-center':
        positions.top = `calc(-30px + ${offsetY})`;
        positions.left = '50%';
        positions.transform = `translateX(-50%) translateX(${offsetX})`;
        break;
      case 'top-right':
        positions.top = `calc(-30px + ${offsetY})`;
        positions.right = `calc(0px - ${offsetX})`;
        break;
      case 'right-top':
        positions.top = `calc(0px + ${offsetY})`;
        positions.right = `calc(-30px - ${offsetX})`;
        break;
      case 'right-middle':
        positions.top = '50%';
        positions.right = `calc(-30px - ${offsetX})`;
        positions.transform = `translateY(-50%) translateY(${offsetY})`;
        break;
      case 'right-bottom':
        positions.bottom = `calc(0px - ${offsetY})`;
        positions.right = `calc(-30px - ${offsetX})`;
        break;
      case 'left-top':
        positions.top = `calc(0px + ${offsetY})`;
        positions.left = `calc(-30px + ${offsetX})`;
        break;
      case 'left-middle':
        positions.top = '50%';
        positions.left = `calc(-30px + ${offsetX})`;
        positions.transform = `translateY(-50%) translateY(${offsetY})`;
        break;
      case 'left-bottom':
        positions.bottom = `calc(0px - ${offsetY})`;
        positions.left = `calc(-30px + ${offsetX})`;
        break;
      case 'bottom-left':
        positions.bottom = `calc(-30px + ${offsetY})`;
        positions.left = `calc(0px + ${offsetX})`;
        break;
      case 'bottom-center':
        positions.bottom = `calc(-30px + ${offsetY})`;
        positions.left = '50%';
        positions.transform = `translateX(-50%) translateX(${offsetX})`;
        break;
      case 'bottom-right':
        positions.bottom = `calc(-30px + ${offsetY})`;
        positions.right = `calc(0px - ${offsetX})`;
        break;
      default:
        // 默认右下角
        positions.bottom = `calc(-30px + ${offsetY})`;
        positions.right = `calc(20px + ${offsetX})`;
    }

    return positions;
  }

  /**
   * 获取挤压模式的布局CSS
   * 为头像容器生成适当的CSS（配合消息容器的flex布局）
   */
  getSqueezePositions(position, offsetX, offsetY) {
    const css = {};

    // 🔥 挤压模式：显式重置悬浮模式的所有定位属性
    css.position = 'static';
    css.display = 'flex';
    css.top = 'auto';        // 重置top
    css.right = 'auto';      // 重置right  
    css.bottom = 'auto';     // 重置bottom
    css.left = 'auto';       // 重置left
    css['z-index'] = 'auto'; // 重置层级
    // 注意：transform在后面统一处理，这里不重置

    // 根据位置设置对齐方式
    if (position) {
      // 垂直对齐
      if (position.includes('top')) {
        css['align-self'] = 'flex-start';
      } else if (position.includes('middle') || position.includes('center')) {
        css['align-self'] = 'center';
      } else if (position.includes('bottom')) {
        css['align-self'] = 'flex-end';
      }

      // 水平对齐（主要用于顶部/底部位置）
      if (position.startsWith('top-') || position.startsWith('bottom-')) {
        if (position.endsWith('-left')) {
          css['justify-self'] = 'flex-start';
        } else if (position.endsWith('-center')) {
          css['justify-self'] = 'center';
        } else if (position.endsWith('-right')) {
          css['justify-self'] = 'flex-end';
        }
      }
    }

    // 应用偏移（使用margin）
    if (offsetX !== '0px' || offsetY !== '0px') {
      css['margin-left'] = offsetX;
      css['margin-top'] = offsetY;
    }

    return css;
  }

  /**
   * 生成挤压模式的消息容器CSS
   * 修改整个消息的flex布局以支持不同头像位置
   */
  generateSqueezeContainerCSS(position) {
    const css = {
      'display': 'flex',
      'align-items': 'flex-start',  // 默认顶部对齐

      // 🔥 重要：重置可能的布局干扰
      'position': 'relative',       // 重置绝对定位
      'z-index': 'auto'             // 重置层级
    };

    if (!position) return css;

    if (position.startsWith('top-')) {
      // 头像在顶部：垂直布局，头像在前
      css['flex-direction'] = 'column';
      css['align-items'] = this.getHorizontalAlignment(position);

    } else if (position.startsWith('bottom-')) {
      // 头像在底部：垂直布局，头像在后  
      css['flex-direction'] = 'column';
      css['align-items'] = this.getHorizontalAlignment(position);

    } else if (position.startsWith('right-')) {
      // 头像在右侧：水平布局，头像在后
      css['flex-direction'] = 'row';
      css['align-items'] = 'flex-start';

    } else if (position.startsWith('left-')) {
      // 头像在左侧：保持默认布局
      css['flex-direction'] = 'row';
      css['align-items'] = 'flex-start';
    }

    return css;
  }

  /**
   * 根据位置获取水平对齐方式
   */
  getHorizontalAlignment(position) {
    if (position.endsWith('-left')) {
      return 'flex-start';
    } else if (position.endsWith('-center')) {
      return 'center';
    } else if (position.endsWith('-right')) {
      return 'flex-end';
    }
    return 'flex-start';
  }

  /**
   * 生成头像包装器的order CSS
   * 控制头像和文字的排列顺序
   */
  generateAvatarWrapperOrderCSS(position) {
    const css = {};

    if (!position) return css;

    // 需要重新排序的情况：头像在后面的位置
    if (position.startsWith('bottom-') || position.startsWith('right-')) {
      css.order = '1';  // 放到文字后面
    }
    // 其他情况(top-*, left-*)保持默认顺序，头像在前

    return css;
  }

  /**
   * 从头像选择器生成消息容器选择器
   */
  getMessageContainerSelector(avatarSelector) {
    // 将 .mes[is_user="true"] .avatar 转换为 .mes[is_user="true"]
    return avatarSelector.replace(/\s+\.avatar.*$/, '');
  }

  // ========================================
  // 🎯 信息显示布局系统 (复用头像布局逻辑)
  // ========================================

  /**
   * 🔥 检查是否为单个信息元素选择器 (删除用户计时器)
   */
  isInfoElementSelector(selector) {
    return selector.includes('.mesIDDisplay') ||
      (selector.includes('.mes_timer') && selector.includes('is_user="false"')) || // 只保留AI计时器
      selector.includes('.tokenCounterDisplay');
  }

  /**
   * 分离信息显示属性：布局属性 vs 样式属性
   */
  separateInfoProperties(properties) {
    const layoutProps = {};
    const styleProps = {};

    // 布局相关属性（作用于信息显示组容器）
    const layoutPropertyNames = [
      'info-layout-mode', 'info-position', 'info-direction',
      'info-offset-x', 'info-offset-y', 'info-rotate',
      'position', 'display', 'flex-direction', 'align-items',
      'justify-content', 'top', 'right', 'bottom', 'left',
      'transform', 'z-index', 'order'
    ];

    for (const [key, value] of Object.entries(properties)) {
      if (layoutPropertyNames.includes(key)) {
        layoutProps[key] = value;
      } else {
        styleProps[key] = value;
      }
    }

    return { layoutProps, styleProps };
  }

  /**
   * 生成信息显示组布局CSS (复用头像布局逻辑)
   */
  generateInfoLayoutCSS(properties) {
    const layoutMode = properties['info-layout-mode'];
    const position = properties['info-position'];
    const direction = properties['info-direction'] || 'column';
    const offsetX = properties['info-offset-x'] || '0px';
    const offsetY = properties['info-offset-y'] || '0px';
    const rotate = properties['info-rotate'] || '0deg';

    const css = {};

    // 🎯 布局相关属性：作用于信息显示组容器
    if (layoutMode === 'overlay') {
      // 悬浮模式：绝对定位，不影响文本布局
      css.position = 'absolute';
      css['z-index'] = '10';
      css.display = 'flex';
      css['flex-direction'] = direction;

      // 根据位置设置定位 (复用头像定位逻辑)
      const positions = this.getOverlayPositions(position, offsetX, offsetY);
      Object.assign(css, positions);

    } else if (layoutMode === 'squeeze') {
      // 挤压模式：影响文本布局
      css.position = 'static';
      css.display = 'flex';
      css['flex-direction'] = direction;

      // 根据位置设置flex布局（包括偏移处理）
      const flexProps = this.getSqueezePositions(position, offsetX, offsetY);
      Object.assign(css, flexProps);
    }

    // 应用旋转（特别处理挤压模式的transform重置）
    if (layoutMode === 'squeeze') {
      // 🔥 挤压模式：显式重置transform，然后应用旋转
      if (rotate !== '0deg') {
        css.transform = `rotate(${rotate})`;
      } else {
        css.transform = 'none';  // 重置transform
      }
    } else if (rotate !== '0deg') {
      // 悬浮模式：累加transform
      css.transform = css.transform ? `${css.transform} rotate(${rotate})` : `rotate(${rotate})`;
    }

    return css;
  }

  /**
   * 生成信息显示挤压模式的消息容器CSS
   */
  generateInfoSqueezeContainerCSS(position) {
    // 复用头像的容器CSS生成逻辑
    return this.generateSqueezeContainerCSS(position);
  }

  /**
   * 生成信息显示包装器的order CSS
   */
  generateInfoWrapperOrderCSS(position) {
    const css = {};

    if (!position) return css;

    // 需要重新排序的情况：信息在后面的位置
    if (position.startsWith('bottom-') || position.startsWith('right-')) {
      css.order = '1';  // 放到其他内容后面
    }

    return css;
  }

  // 🔥 删除虚拟组相关方法 - 按用户要求全部使用单个元素控制

  /**
   * 🔥 简化：为单个信息元素生成布局CSS (每个元素独立控制)
   */
  generateInfoElementCSS(layoutProps, elementSelector) {
    const layoutMode = layoutProps['info-layout-mode'];
    const position = layoutProps['info-position'];
    const offsetX = layoutProps['info-offset-x'] || '0px';
    const offsetY = layoutProps['info-offset-y'] || '0px';
    const rotate = layoutProps['info-rotate'] || '0deg';

    const css = {};

    if (layoutMode === 'overlay') {
      // 悬浮模式：元素独立绝对定位
      css.position = 'absolute';
      css['z-index'] = '10';

      // 直接使用用户设置的位置和偏移
      const basePositions = this.getOverlayPositions(position, offsetX, offsetY);
      Object.assign(css, basePositions);

    } else if (layoutMode === 'squeeze') {
      // 挤压模式：flex布局
      css.position = 'static';
      css.display = 'inline-block'; // 行内块元素，便于排列
      css.margin = '0 2px'; // 小间距

      const flexProps = this.getSqueezePositions(position, offsetX, offsetY);
      Object.assign(css, flexProps);
    }

    // 应用旋转
    if (rotate !== '0deg') {
      css.transform = css.transform ? `${css.transform} rotate(${rotate})` : `rotate(${rotate})`;
    }

    return css;
  }

  // 🔥 删除不再需要的虚拟组索引和包装器方法

  /**
   * 生成CSS
   */
  generate(styleRules, config = {}) {
    // 合并配置
    const finalConfig = { ...this.config, ...config };

    // 预处理头像布局属性
    styleRules = this.preprocessAvatarLayout(styleRules);

    // 预处理信息显示布局属性
    styleRules = this.preprocessInfoLayout(styleRules);

    if (!styleRules || styleRules.size === 0) {
      return '';
    }

    let css = '';

    // 添加头部注释 - 修复：传递styleRules参数
    if (finalConfig.addComments) {
      css += this.generateHeader(styleRules);
    }

    // 生成规则
    if (finalConfig.groupBySelector) {
      css += this.generateGroupedRules(styleRules, finalConfig);
    } else {
      css += this.generateFlatRules(styleRules, finalConfig);
    }

    // 压缩处理
    if (finalConfig.minify) {
      css = this.minifyCSS(css);
    }

    return css;
  }

  /**
   * 生成头部注释 - 修复：接收styleRules参数
   */
  generateHeader(styleRules) {
    const now = new Date().toLocaleString('zh-CN');
    const ruleCount = styleRules ? styleRules.size : 0;
    return `/* 
 * Generated by Visual CSS Editor
 * Time: ${now}
 * Rules: ${ruleCount}
 */\n\n`;
  }

  /**
   * 生成分组规则
   */
  generateGroupedRules(styleRules, config) {
    let css = '';
    const categories = this.categorizeRules(styleRules);

    for (const [category, rules] of Object.entries(categories)) {
      if (rules.length === 0) continue;

      // 添加分类注释
      if (config.addComments) {
        css += `/* === ${this.getCategoryName(category)} === */\n`;
      }

      // 生成该分类的规则
      for (const [selector, properties] of rules) {
        css += this.generateRule(selector, properties, config);
      }

      css += '\n';
    }

    return css;
  }

  /**
   * 生成平铺规则
   */
  generateFlatRules(styleRules, config) {
    let css = '';

    for (const [selector, properties] of styleRules) {
      css += this.generateRule(selector, properties, config);
    }

    return css;
  }

  /**
   * 生成单条规则
   */
  generateRule(selector, properties, config) {
    if (!properties || Object.keys(properties).length === 0) {
      return '';
    }

    const indent = config.minify ? '' : ' '.repeat(config.indentSize);
    const newline = config.minify ? '' : '\n';
    const space = config.minify ? '' : ' ';

    let css = `${selector}${space}{${newline}`;

    // 排序属性
    const sortedProps = config.sortProperties
      ? this.sortProperties(properties)
      : Object.entries(properties);

    // 生成属性声明
    for (const [prop, value] of sortedProps) {
      const important = config.useImportant ? ' !important' : '';
      css += `${indent}${prop}:${space}${value}${important};${newline}`;
    }

    css += `}${newline}`;

    return css;
  }

  /**
   * 分类规则
   */
  categorizeRules(styleRules) {
    const categories = {
      layout: [],
      message: [],
      input: [],
      controls: [],
      popup: [],
      other: []
    };

    for (const [selector, properties] of styleRules) {
      const category = this.detectCategory(selector);
      categories[category].push([selector, properties]);
    }

    return categories;
  }

  /**
   * 检测选择器类别
   */
  detectCategory(selector) {
    if (selector.includes('#chat') || selector.includes('#top-bar') ||
      selector.includes('.drawer')) {
      return 'layout';
    }

    if (selector.includes('.mes') || selector.includes('.avatar') ||
      selector.includes('.ch_name')) {
      return 'message';
    }

    if (selector.includes('#send') || selector.includes('textarea')) {
      return 'input';
    }

    if (selector.includes('button') || selector.includes('.swipe')) {
      return 'controls';
    }

    if (selector.includes('.popup') || selector.includes('modal')) {
      return 'popup';
    }

    return 'other';
  }

  /**
   * 获取类别名称
   */
  getCategoryName(category) {
    const names = {
      layout: '布局样式',
      message: '消息样式',
      input: '输入样式',
      controls: '控件样式',
      popup: '弹窗样式',
      other: '其他样式'
    };

    return names[category] || '未分类';
  }

  /**
   * 排序属性
   */
  sortProperties(properties) {
    const entries = Object.entries(properties);

    return entries.sort((a, b) => {
      const indexA = this.propertyOrder.indexOf(a[0]);
      const indexB = this.propertyOrder.indexOf(b[0]);

      // 如果都在排序列表中
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // 如果只有一个在列表中
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // 都不在列表中，按字母顺序
      return a[0].localeCompare(b[0]);
    });
  }

  /**
   * 压缩CSS
   */
  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '')  // 移除注释
      .replace(/\s+/g, ' ')               // 合并空白
      .replace(/\s*([{}:;,])\s*/g, '$1') // 移除符号周围空白
      .replace(/;\}/g, '}')               // 移除最后的分号
      .trim();
  }

  /**
   * 优化CSS
   */
  optimize(styleRules) {
    const optimized = new Map();

    for (const [selector, properties] of styleRules) {
      // 合并相似属性
      const merged = this.mergeProperties(properties);

      // 移除冗余属性
      const cleaned = this.removeRedundant(merged);

      if (Object.keys(cleaned).length > 0) {
        optimized.set(selector, cleaned);
      }
    }

    return optimized;
  }

  /**
   * 合并属性
   */
  mergeProperties(properties) {
    const merged = { ...properties };

    // 合并margin
    if (this.canMergeBox(merged, 'margin')) {
      const value = this.mergeBox(merged, 'margin');
      if (value) {
        merged.margin = value;
        delete merged['margin-top'];
        delete merged['margin-right'];
        delete merged['margin-bottom'];
        delete merged['margin-left'];
      }
    }

    // 合并padding
    if (this.canMergeBox(merged, 'padding')) {
      const value = this.mergeBox(merged, 'padding');
      if (value) {
        merged.padding = value;
        delete merged['padding-top'];
        delete merged['padding-right'];
        delete merged['padding-bottom'];
        delete merged['padding-left'];
      }
    }

    // 合并border
    if (this.canMergeBorder(merged)) {
      const value = this.mergeBorder(merged);
      if (value) {
        merged.border = value;
        delete merged['border-width'];
        delete merged['border-style'];
        delete merged['border-color'];
      }
    }

    return merged;
  }

  /**
   * 判断是否可以合并盒模型属性
   */
  canMergeBox(properties, prefix) {
    const sides = ['top', 'right', 'bottom', 'left'];
    return sides.every(side => `${prefix}-${side}` in properties);
  }

  /**
   * 合并盒模型属性
   */
  mergeBox(properties, prefix) {
    const t = properties[`${prefix}-top`];
    const r = properties[`${prefix}-right`];
    const b = properties[`${prefix}-bottom`];
    const l = properties[`${prefix}-left`];

    // 四边相同
    if (t === r && t === b && t === l) {
      return t;
    }

    // 上下相同，左右相同
    if (t === b && r === l) {
      return `${t} ${r}`;
    }

    // 左右相同
    if (r === l) {
      return `${t} ${r} ${b}`;
    }

    // 四边都不同
    return `${t} ${r} ${b} ${l}`;
  }

  /**
   * 判断是否可以合并边框
   */
  canMergeBorder(properties) {
    return 'border-width' in properties &&
      'border-style' in properties &&
      'border-color' in properties;
  }

  /**
   * 合并边框属性
   */
  mergeBorder(properties) {
    const width = properties['border-width'];
    const style = properties['border-style'];
    const color = properties['border-color'];

    if (width && style && color) {
      return `${width} ${style} ${color}`;
    }

    return null;
  }

  /**
   * 移除冗余属性
   */
  removeRedundant(properties) {
    const cleaned = { ...properties };

    // 如果有border简写，移除分开的属性
    if (cleaned.border) {
      delete cleaned['border-width'];
      delete cleaned['border-style'];
      delete cleaned['border-color'];
      delete cleaned['border-top'];
      delete cleaned['border-right'];
      delete cleaned['border-bottom'];
      delete cleaned['border-left'];
    }

    // 如果有margin简写，移除分开的属性
    if (cleaned.margin) {
      delete cleaned['margin-top'];
      delete cleaned['margin-right'];
      delete cleaned['margin-bottom'];
      delete cleaned['margin-left'];
    }

    // 如果有padding简写，移除分开的属性
    if (cleaned.padding) {
      delete cleaned['padding-top'];
      delete cleaned['padding-right'];
      delete cleaned['padding-bottom'];
      delete cleaned['padding-left'];
    }

    // 如果有background简写，移除分开的属性
    if (cleaned.background && !cleaned.background.includes('gradient')) {
      delete cleaned['background-color'];
      delete cleaned['background-image'];
      delete cleaned['background-repeat'];
      delete cleaned['background-position'];
      delete cleaned['background-size'];
    }

    return cleaned;
  }

  /**
   * 生成渐变代码
   */
  generateGradient(type, colors, angle = 90) {
    if (type === 'linear') {
      const colorStops = colors.map((c, i) =>
        `${c.color} ${c.position || (i * 100 / (colors.length - 1))}%`
      ).join(', ');

      return `linear-gradient(${angle}deg, ${colorStops})`;
    } else if (type === 'radial') {
      const colorStops = colors.map((c, i) =>
        `${c.color} ${c.position || (i * 100 / (colors.length - 1))}%`
      ).join(', ');

      return `radial-gradient(circle, ${colorStops})`;
    }

    return '';
  }

  /**
   * 生成阴影代码
   */
  generateShadow(shadows) {
    return shadows.map(s => {
      const inset = s.inset ? 'inset ' : '';
      return `${inset}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
    }).join(', ');
  }

  /**
   * 生成动画代码
   */
  generateAnimation(name, duration, easing, delay, iteration) {
    const parts = [
      name,
      `${duration}ms`,
      easing || 'ease',
      delay ? `${delay}ms` : '0ms',
      iteration || '1',
      'normal',
      'none',
      'running'
    ];

    return parts.join(' ');
  }

  /**
   * 导出为不同格式
   */
  export(styleRules, format = 'css') {
    switch (format) {
      case 'css':
        return this.generate(styleRules);

      case 'scss':
        return this.generateSCSS(styleRules);

      case 'json':
        return JSON.stringify(Array.from(styleRules.entries()), null, 2);

      default:
        return this.generate(styleRules);
    }
  }

  /**
   * 生成SCSS格式
   */
  generateSCSS(styleRules) {
    let scss = '';

    // 按嵌套结构组织
    const nested = this.buildNesting(styleRules);

    for (const [selector, data] of Object.entries(nested)) {
      scss += this.generateSCSSRule(selector, data);
    }

    return scss;
  }

  /**
   * 构建嵌套结构
   */
  buildNesting(styleRules) {
    const nested = {};

    for (const [selector, properties] of styleRules) {
      // 简单处理，实际可以更复杂
      nested[selector] = {
        properties,
        children: {}
      };
    }

    return nested;
  }

  /**
   * 生成SCSS规则
   */
  generateSCSSRule(selector, data, indent = 0) {
    const indentStr = '  '.repeat(indent);
    let scss = `${indentStr}${selector} {\n`;

    // 生成属性
    for (const [prop, value] of Object.entries(data.properties || {})) {
      scss += `${indentStr}  ${prop}: ${value};\n`;
    }

    // 生成子规则
    for (const [childSelector, childData] of Object.entries(data.children || {})) {
      scss += this.generateSCSSRule(childSelector, childData, indent + 1);
    }

    scss += `${indentStr}}\n`;

    return scss;
  }
}