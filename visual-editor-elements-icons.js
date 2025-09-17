/**
 * 可视化CSS编辑器 - 图标替换元素定义（选择器修正版）
 * 功能：实现图标替换和样式调整，支持批量操作
 * 
 * 创建时间：2025-01-09
 * 增强时间：2025-01-XX - 添加批量操作支持
 * 修复时间：2025-01-XX - 修正选择器，使用正确的DOM路径
 * 重构时间：2025-01-XX - 优化重复功能，调用主模块方法
 * 作者：SGTY & Assistant
 * 
 * 说明：
 * - 支持单个图标独立设置
 * - 支持图标组统一设置
 * - 支持交替模式设置（奇偶不同样式）
 * 
 * 🔧 重构优化：
 * - createIconStyleHandler: 优先调用主模块的updateStyle方法
 * - IconBatchHelper.applyToGroup: 调用注册中心的批量应用方法
 * - IconBatchHelper.copyStyles: 调用注册中心的样式复制方法
 * - 保持_iconData本地存储（用于状态检测和条件判断）
 * - 保持向后兼容性（提供备用方案）
 */

// ========== 图标组定义 ==========
export const IconGroups = {
  // 导航栏图标组（9个）
  navigation: {
    name: '导航栏图标',
    description: '顶部导航栏的9个功能图标',
    members: [
      '#leftNavDrawerIcon',                         // AI响应配置
      '#API-status-top',                            // API连接
      '#advanced-formatting-button .drawer-icon',   // AI回复格式化
      '#WIDrawerIcon',                              // 世界信息
      '#user-settings-button .drawer-icon',         // 用户设置
      '#logo_block .drawer-icon',                   // 更改背景图片
      '#extensions-settings-button .drawer-icon',   // 扩展
      '#persona-management-button .drawer-icon',    // 用户角色管理
      '#rightNavDrawerIcon'                         // 角色管理
    ]
  },

  // 预设按钮组
  presetButtons: {
    name: '预设功能按钮',
    description: '各种预设和提示相关的按钮',
    members: [
      '.fa-fw.fa-solid.fa-asterisk[title="Preset Prompt"]',
      '.fa-fw.fa-solid.fa-thumb-tack[title="Marker"]',
      '.fa-fw.fa-solid.fa-square-poll-horizontal[title="Global Prompt"]',
      '.fa-fw.fa-solid.fa-syringe[title="In-Chat Injection"]'
    ]
  },

  // 消息编辑按钮组
  messageButtons: {
    name: '消息操作按钮',
    description: '消息的编辑和更多操作按钮',
    members: [
      '.mes:not([is_user="true"]) .mes_button.extraMesButtonsHint',
      '.mes:not([is_user="true"]) .mes_button.mes_edit',
      '.mes[is_user="true"] .mes_button.extraMesButtonsHint',
      '.mes[is_user="true"] .mes_button.mes_edit'
    ],
    // 子分组定义
    subGroups: {
      character: [
        '.mes:not([is_user="true"]) .mes_button.extraMesButtonsHint',
        '.mes:not([is_user="true"]) .mes_button.mes_edit'
      ],
      user: [
        '.mes[is_user="true"] .mes_button.extraMesButtonsHint',
        '.mes[is_user="true"] .mes_button.mes_edit'
      ]
    }
  },

  // 发送按钮组（新增）
  sendButtons: {
    name: '发送控制按钮',
    description: '发送和停止按钮',
    members: [
      '#send_but',     // 发送按钮
      '#mes_stop'      // 停止按钮
    ]
  },

  // 左下角菜单组（新增）
  bottomMenuButtons: {
    name: '左下角菜单按钮',
    description: '选项和扩展菜单按钮',
    members: [
      '#options_button',         // 选项按钮
      '#extensionsMenuButton'    // 扩展菜单按钮
    ]
  }
};

// ========== 通用图标属性生成器 ==========
function createIconProperties(defaultValues = {}) {
  return {
    // ========== 图标基础设置 ==========
    'background-image': {
      type: 'text',
      label: '图标URL',
      defaultValue: defaultValues.backgroundImage || '',
      placeholder: 'https://图标地址.png 或 url(https://...)',
      category: 'icon',
      hint: '留空使用原生图标，输入URL替换图标（可不带url()）'
    },

    'icon-color': {
      type: 'color',
      label: '图标颜色',
      defaultValue: defaultValues.iconColor || '',
      category: 'icon',
      hint: '仅对Font Awesome原生图标有效（使用CSS变量--SmartThemeBodyColor）'
    },

    // ========== 尺寸控制 ==========
    'width': {
      type: 'text',
      label: '宽度',
      defaultValue: defaultValues.width || '',
      placeholder: '如: 24px, 1.5em, calc(1.1em + 1px)',
      category: 'size',
      hint: '留空使用默认大小'
    },

    'height': {
      type: 'text',
      label: '高度',
      defaultValue: defaultValues.height || '',
      placeholder: '如: 24px, 1.5em, calc(1.1em + 1px)',
      category: 'size',
      hint: '留空使用默认大小'
    },

    'font-size': {
      type: 'slider',
      label: '图标大小',
      defaultValue: defaultValues.fontSize || 100,
      min: 50,
      max: 200,
      step: 10,
      unit: '%',
      category: 'size',
      hint: '调整原生图标的字体大小'
    },

    // ========== 按钮阴影设置（box-shadow） ==========
    'button-shadow-enabled': {
      type: 'toggle',
      label: '启用按钮阴影',
      defaultValue: defaultValues.buttonShadowEnabled || false,
      onValue: 'enabled',
      offValue: 'disabled',
      category: 'button-shadow',
      hint: '为整个按钮添加阴影效果'
    },

    'button-shadow-x': {
      type: 'slider',
      label: '按钮阴影X偏移',
      defaultValue: defaultValues.buttonShadowX || 0,
      min: -20,
      max: 20,
      step: 1,
      unit: 'px',
      category: 'button-shadow',
      hint: '负值向左，正值向右',
      showIf: 'button-shadow-enabled:enabled'
    },

    'button-shadow-y': {
      type: 'slider',
      label: '按钮阴影Y偏移',
      defaultValue: defaultValues.buttonShadowY || 2,
      min: -20,
      max: 20,
      step: 1,
      unit: 'px',
      category: 'button-shadow',
      hint: '负值向上，正值向下',
      showIf: 'button-shadow-enabled:enabled'
    },

    'button-shadow-blur': {
      type: 'slider',
      label: '按钮阴影模糊',
      defaultValue: defaultValues.buttonShadowBlur || 4,
      min: 0,
      max: 30,
      step: 1,
      unit: 'px',
      category: 'button-shadow',
      hint: '模糊半径',
      showIf: 'button-shadow-enabled:enabled'
    },

    'button-shadow-spread': {
      type: 'slider',
      label: '按钮阴影扩散',
      defaultValue: defaultValues.buttonShadowSpread || 0,
      min: -10,
      max: 10,
      step: 1,
      unit: 'px',
      category: 'button-shadow',
      hint: '阴影扩散半径',
      showIf: 'button-shadow-enabled:enabled'
    },

    'button-shadow-color': {
      type: 'color',
      label: '按钮阴影颜色',
      defaultValue: defaultValues.buttonShadowColor || '#000000',
      category: 'button-shadow',
      hint: '按钮阴影的颜色',
      showIf: 'button-shadow-enabled:enabled'
    },

    'button-shadow-opacity': {
      type: 'slider',
      label: '按钮阴影透明度',
      defaultValue: defaultValues.buttonShadowOpacity || 30,
      min: 0,
      max: 100,
      step: 5,
      unit: '%',
      category: 'button-shadow',
      hint: '按钮阴影的透明度',
      showIf: 'button-shadow-enabled:enabled'
    },

    // ========== 图标阴影设置（drop-shadow） ==========
    'icon-shadow-enabled': {
      type: 'toggle',
      label: '启用图标阴影',
      defaultValue: defaultValues.iconShadowEnabled || false,
      onValue: 'enabled',
      offValue: 'disabled',
      category: 'icon-shadow',
      hint: '为图标本身添加投影效果（不包括按钮背景）'
    },

    'icon-shadow-x': {
      type: 'slider',
      label: '图标阴影X偏移',
      defaultValue: defaultValues.iconShadowX || 0,
      min: -20,
      max: 20,
      step: 1,
      unit: 'px',
      category: 'icon-shadow',
      hint: '负值向左，正值向右',
      showIf: 'icon-shadow-enabled:enabled'
    },

    'icon-shadow-y': {
      type: 'slider',
      label: '图标阴影Y偏移',
      defaultValue: defaultValues.iconShadowY || 2,
      min: -20,
      max: 20,
      step: 1,
      unit: 'px',
      category: 'icon-shadow',
      hint: '负值向上，正值向下',
      showIf: 'icon-shadow-enabled:enabled'
    },

    'icon-shadow-blur': {
      type: 'slider',
      label: '图标阴影模糊',
      defaultValue: defaultValues.iconShadowBlur || 4,
      min: 0,
      max: 30,
      step: 1,
      unit: 'px',
      category: 'icon-shadow',
      hint: '模糊半径',
      showIf: 'icon-shadow-enabled:enabled'
    },

    'icon-shadow-color': {
      type: 'color',
      label: '图标阴影颜色',
      defaultValue: defaultValues.iconShadowColor || '#000000',
      category: 'icon-shadow',
      hint: '图标阴影的颜色',
      showIf: 'icon-shadow-enabled:enabled'
    },

    'icon-shadow-opacity': {
      type: 'slider',
      label: '图标阴影透明度',
      defaultValue: defaultValues.iconShadowOpacity || 30,
      min: 0,
      max: 100,
      step: 5,
      unit: '%',
      category: 'icon-shadow',
      hint: '图标阴影的透明度',
      showIf: 'icon-shadow-enabled:enabled'
    },

    // ========== 其他效果 ==========
    'opacity': {
      type: 'slider',
      label: '透明度',
      defaultValue: defaultValues.opacity || 100,
      min: 0,
      max: 100,
      step: 5,
      unit: '%',
      category: 'effects',
      hint: '整体透明度'
    },

    'blur': {
      type: 'slider',
      label: '模糊效果',
      defaultValue: defaultValues.blur || 0,
      min: 0,
      max: 10,
      step: 0.5,
      unit: 'px',
      category: 'effects',
      hint: '给图标添加模糊效果'
    },

    'brightness': {
      type: 'slider',
      label: '亮度',
      defaultValue: defaultValues.brightness || 100,
      min: 0,
      max: 200,
      step: 10,
      unit: '%',
      category: 'effects',
      hint: '调整图标亮度'
    },

    'contrast': {
      type: 'slider',
      label: '对比度',
      defaultValue: defaultValues.contrast || 100,
      min: 0,
      max: 200,
      step: 10,
      unit: '%',
      category: 'effects',
      hint: '调整图标对比度'
    },

    'grayscale': {
      type: 'slider',
      label: '灰度',
      defaultValue: defaultValues.grayscale || 0,
      min: 0,
      max: 100,
      step: 10,
      unit: '%',
      category: 'effects',
      hint: '将图标转为灰度'
    },

    'transform': {
      type: 'text',
      label: '变换',
      defaultValue: defaultValues.transform || '',
      placeholder: '如: scale(1.2) rotate(45deg)',
      category: 'effects',
      hint: '支持scale、rotate、translate等'
    },

    'transition': {
      type: 'text',
      label: '过渡动画',
      defaultValue: defaultValues.transition || 'all 0.3s ease',
      placeholder: 'all 0.3s ease',
      category: 'effects',
      hint: '鼠标悬停时的过渡效果'
    }
  };
}

// ========== 通用样式应用处理器 ==========
function createIconStyleHandler() {
  return function (selector, property, value) {

    const element = document.querySelector(selector);
    if (!element) return null;

    // 🔧 获取主模块实例（用于调用主模块功能）
    const mainModule = window.EnhancedCSS?.getModule?.('visual-editor');
    if (!mainModule) {
      console.warn('[IconElements] 主模块未找到，使用本地处理');
    }

    // 初始化数据存储
    if (!element._iconData) {
      element._iconData = {
        backgroundImage: '',
        iconColor: '',
        width: '',
        height: '',
        fontSize: 100,
        opacity: 100,
        buttonShadowEnabled: false,
        buttonShadowX: 0,
        buttonShadowY: 2,
        buttonShadowBlur: 4,
        buttonShadowSpread: 0,
        buttonShadowColor: '#000000',
        buttonShadowOpacity: 30,
        iconShadowEnabled: false,
        iconShadowX: 0,
        iconShadowY: 2,
        iconShadowBlur: 4,
        iconShadowColor: '#000000',
        iconShadowOpacity: 30,
        blur: 0,
        brightness: 100,
        contrast: 100,
        grayscale: 0,
        transform: '',
        transition: 'all 0.3s ease'
      };
    }

    const styles = {};
    const additionalCSS = [];

    // 🔧 处理特殊属性转换（调用主模块前）
    let processedValue = value;
    if (property === 'background-image' && value && !value.startsWith('url(')) {
      processedValue = `url(${value})`;
    }

    // 🚀 优先调用主模块的updateStyle方法
    if (mainModule && mainModule.updateStyle) {
      mainModule.updateStyle(selector, property, processedValue);
    }

    // 处理属性更新（保持本地_iconData同步）
    switch (property) {
      case 'background-image':
        if (value) {
          let bgImage = value.trim();
          if (!bgImage.startsWith('url(')) {
            bgImage = `url(${bgImage})`;
          }
          element._iconData.backgroundImage = bgImage;
          styles['background'] = `${bgImage} center center / contain no-repeat`;
          styles['width'] = element._iconData.width || 'calc(1.1em + 1px)';
          styles['height'] = element._iconData.height || 'calc(1.1em + 1px)';
          styles['background-clip'] = 'content-box';
          styles['background-origin'] = 'content-box';

          // 对于带有子元素的图标，需要隐藏所有内容
          additionalCSS.push(`
            ${selector}::before {
              display: none !important;
              content: none !important;
            }
            ${selector} * {
              display: none !important;
            }
          `);
        } else {
          element._iconData.backgroundImage = '';
          styles['background'] = 'none';
          additionalCSS.push(`
            ${selector}::before {
              display: inline-block !important;
            }
            ${selector} * {
              display: inherit;
            }
          `);
        }
        break;

      case 'icon-color':
        element._iconData.iconColor = value;
        if (value && !element._iconData.backgroundImage) {
          // 使用CSS变量或直接颜色
          const colorValue = value === 'theme' ? 'var(--SmartThemeBodyColor)' : value;
          additionalCSS.push(`
            ${selector}::before {
              color: ${colorValue} !important;
            }
          `);
        }
        break;

      case 'width':
        element._iconData.width = value;
        if (value) styles['width'] = value;
        break;

      case 'height':
        element._iconData.height = value;
        if (value) styles['height'] = value;
        break;

      case 'font-size':
        element._iconData.fontSize = parseFloat(value) || 100;
        if (!element._iconData.backgroundImage) {
          styles['font-size'] = `${element._iconData.fontSize}%`;
        }
        break;

      case 'button-shadow-enabled':
        element._iconData.buttonShadowEnabled = value === 'enabled';
        break;
      case 'button-shadow-x':
        element._iconData.buttonShadowX = parseFloat(value) || 0;
        break;
      case 'button-shadow-y':
        element._iconData.buttonShadowY = parseFloat(value) || 0;
        break;
      case 'button-shadow-blur':
        element._iconData.buttonShadowBlur = parseFloat(value) || 0;
        break;
      case 'button-shadow-spread':
        element._iconData.buttonShadowSpread = parseFloat(value) || 0;
        break;
      case 'button-shadow-color':
        element._iconData.buttonShadowColor = value || '#000000';
        break;
      case 'button-shadow-opacity':
        element._iconData.buttonShadowOpacity = parseFloat(value) || 30;
        break;

      case 'icon-shadow-enabled':
        element._iconData.iconShadowEnabled = value === 'enabled';
        break;
      case 'icon-shadow-x':
        element._iconData.iconShadowX = parseFloat(value) || 0;
        break;
      case 'icon-shadow-y':
        element._iconData.iconShadowY = parseFloat(value) || 0;
        break;
      case 'icon-shadow-blur':
        element._iconData.iconShadowBlur = parseFloat(value) || 0;
        break;
      case 'icon-shadow-color':
        element._iconData.iconShadowColor = value || '#000000';
        break;
      case 'icon-shadow-opacity':
        element._iconData.iconShadowOpacity = parseFloat(value) || 30;
        break;

      case 'opacity':
        element._iconData.opacity = parseFloat(value) || 100;
        styles['opacity'] = (element._iconData.opacity / 100).toString();
        break;

      case 'blur':
        element._iconData.blur = parseFloat(value) || 0;
        break;

      case 'brightness':
        element._iconData.brightness = parseFloat(value) || 100;
        break;

      case 'contrast':
        element._iconData.contrast = parseFloat(value) || 100;
        break;

      case 'grayscale':
        element._iconData.grayscale = parseFloat(value) || 0;
        break;

      case 'transform':
        element._iconData.transform = value;
        if (value) styles['transform'] = value;
        break;

      case 'transition':
        element._iconData.transition = value || 'all 0.3s ease';
        styles['transition'] = element._iconData.transition;
        break;
    }

    // 构建按钮阴影
    if (element._iconData.buttonShadowEnabled) {
      let shadowColor = element._iconData.buttonShadowColor;
      if (shadowColor.startsWith('#')) {
        const r = parseInt(shadowColor.slice(1, 3), 16);
        const g = parseInt(shadowColor.slice(3, 5), 16);
        const b = parseInt(shadowColor.slice(5, 7), 16);
        const a = element._iconData.buttonShadowOpacity / 100;
        shadowColor = `rgba(${r}, ${g}, ${b}, ${a})`;
      }
      const boxShadow = `${element._iconData.buttonShadowX}px ${element._iconData.buttonShadowY}px ${element._iconData.buttonShadowBlur}px ${element._iconData.buttonShadowSpread}px ${shadowColor}`;
      styles['box-shadow'] = boxShadow;
    } else {
      styles['box-shadow'] = 'none';
    }

    // 构建图标滤镜
    const filters = [];
    if (element._iconData.iconShadowEnabled) {
      let shadowColor = element._iconData.iconShadowColor;
      if (shadowColor.startsWith('#')) {
        const r = parseInt(shadowColor.slice(1, 3), 16);
        const g = parseInt(shadowColor.slice(3, 5), 16);
        const b = parseInt(shadowColor.slice(5, 7), 16);
        const a = element._iconData.iconShadowOpacity / 100;
        shadowColor = `rgba(${r}, ${g}, ${b}, ${a})`;
      }
      filters.push(`drop-shadow(${element._iconData.iconShadowX}px ${element._iconData.iconShadowY}px ${element._iconData.iconShadowBlur}px ${shadowColor})`);
    }

    if (element._iconData.blur > 0) {
      filters.push(`blur(${element._iconData.blur}px)`);
    }
    if (element._iconData.brightness !== 100) {
      filters.push(`brightness(${element._iconData.brightness}%)`);
    }
    if (element._iconData.contrast !== 100) {
      filters.push(`contrast(${element._iconData.contrast}%)`);
    }
    if (element._iconData.grayscale > 0) {
      filters.push(`grayscale(${element._iconData.grayscale}%)`);
    }

    if (filters.length > 0) {
      styles['filter'] = filters.join(' ');
    } else {
      styles['filter'] = 'none';
    }

    const result = { additionalStyles: styles };
    if (additionalCSS.length > 0) {
      result.additionalCSS = additionalCSS.join('\n');
    }

    return result;
  };
}

/**
 * 创建图标清除样式处理器
 * @returns {Function} 清除样式处理函数
 */
function createIconClearHandler() {
  return function (selector) {

    const element = document.querySelector(selector);
    if (!element) {
      console.warn('[IconElements] 元素未找到:', selector);
      return false;
    }

    try {
      // 🔥 清除_iconData本地数据
      if (element._iconData) {
        delete element._iconData;
      }

      // 🔥 清除DOM上的内联样式（图标特有的）
      const iconSpecificStyles = [
        'background', 'background-image', 'background-size', 'background-position', 'background-repeat',
        'color', 'width', 'height', 'font-size', 'opacity', 'filter', 'transform', 'transition', 'box-shadow'
      ];

      iconSpecificStyles.forEach(property => {
        element.style.removeProperty(property);
      });

      return true;
    } catch (error) {
      console.error('[IconElements] 清除样式失败:', error);
      return false;
    }
  };
}

// ========== 图标元素定义 ==========
export const IconElements = [
  // ========== 导航栏图标组 ==========
  // AI响应配置按钮（已完成的示例）
  {
    selector: '#leftNavDrawerIcon',
    displayName: 'AI响应配置',
    category: 'icons',
    groupId: 'navigation',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // API连接
  {
    selector: '#API-status-top',
    displayName: 'API连接',
    category: 'icons',
    groupId: 'navigation',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // AI回复格式化
  {
    selector: '#advanced-formatting-button .drawer-icon',
    displayName: 'AI回复格式化',
    category: 'icons',
    groupId: 'navigation',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // 世界信息
  {
    selector: '#WIDrawerIcon',
    displayName: '世界信息',
    category: 'icons',
    groupId: 'navigation',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // 用户设置
  {
    selector: '#user-settings-button .drawer-icon',
    displayName: '用户设置',
    category: 'icons',
    groupId: 'navigation',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // 更改背景图片
  {
    selector: '#logo_block .drawer-icon',
    displayName: '更改背景图片',
    category: 'icons',
    groupId: 'navigation',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // 扩展
  {
    selector: '#extensions-settings-button .drawer-icon',
    displayName: '扩展',
    category: 'icons',
    groupId: 'navigation',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // 用户角色管理
  {
    selector: '#persona-management-button .drawer-icon',
    displayName: '用户角色管理',
    category: 'icons',
    groupId: 'navigation',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // 角色管理
  {
    selector: '#rightNavDrawerIcon',
    displayName: '角色管理',
    category: 'icons',
    groupId: 'navigation',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // ========== 预设按钮组 ==========
  {
    selector: '.fa-fw.fa-solid.fa-asterisk[title="Preset Prompt"]',
    displayName: '预设提示',
    category: 'icons',
    groupId: 'presetButtons',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  {
    selector: '.fa-fw.fa-solid.fa-thumb-tack[title="Marker"]',
    displayName: '标记',
    category: 'icons',
    groupId: 'presetButtons',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  {
    selector: '.fa-fw.fa-solid.fa-square-poll-horizontal[title="Global Prompt"]',
    displayName: '全局提示',
    category: 'icons',
    groupId: 'presetButtons',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  {
    selector: '.fa-fw.fa-solid.fa-syringe[title="In-Chat Injection"]',
    displayName: '聊天注入',
    category: 'icons',
    groupId: 'presetButtons',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // ========== 消息编辑按钮组 ==========
  {
    selector: '.mes:not([is_user="true"]) .mes_button.extraMesButtonsHint',
    displayName: '角色消息更多',
    category: 'icons',
    groupId: 'messageButtons',
    subGroupId: 'character',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  {
    selector: '.mes:not([is_user="true"]) .mes_button.mes_edit',
    displayName: '角色消息编辑',
    category: 'icons',
    groupId: 'messageButtons',
    subGroupId: 'character',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  {
    selector: '.mes[is_user="true"] .mes_button.extraMesButtonsHint',
    displayName: '用户消息更多',
    category: 'icons',
    groupId: 'messageButtons',
    subGroupId: 'user',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  {
    selector: '.mes[is_user="true"] .mes_button.mes_edit',
    displayName: '用户消息编辑',
    category: 'icons',
    groupId: 'messageButtons',
    subGroupId: 'user',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // ========== 发送控制按钮组 ==========
  {
    selector: '#send_but',
    displayName: '发送按钮',
    category: 'icons',
    groupId: 'sendButtons',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  {
    selector: '#mes_stop',
    displayName: '停止按钮',
    category: 'icons',
    groupId: 'sendButtons',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  // ========== 左下角菜单按钮组 ==========
  {
    selector: '#options_button',
    displayName: '选项按钮',
    category: 'icons',
    groupId: 'bottomMenuButtons',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  },

  {
    selector: '#extensionsMenuButton',
    displayName: '扩展菜单按钮',
    category: 'icons',
    groupId: 'bottomMenuButtons',
    editableProperties: createIconProperties(),
    onStyleApply: createIconStyleHandler(),
    onStyleClear: createIconClearHandler()
  }
];

/**
 * 图标批量操作辅助类
 */
export class IconBatchHelper {
  /**
   * 获取组内所有图标元素
   * @param {string} groupId - 组ID
   * @returns {Array} 图标元素数组
   */
  static getGroupElements(groupId) {
    return IconElements.filter(el => el.groupId === groupId);
  }

  /**
   * 获取子组内的图标元素
   * @param {string} groupId - 组ID
   * @param {string} subGroupId - 子组ID
   * @returns {Array} 图标元素数组
   */
  static getSubGroupElements(groupId, subGroupId) {
    return IconElements.filter(el =>
      el.groupId === groupId && el.subGroupId === subGroupId
    );
  }

  /**
   * 批量应用样式到组（重构版 - 调用注册中心方法）
   * @param {Object} registry - 注册中心实例
   * @param {string} groupId - 组ID
   * @param {Object} styles - 样式对象
   * @param {Object} options - 选项（如：alternating模式）
   */
  static applyToGroup(registry, groupId, styles, options = {}) {
    // ✅ 统一调用注册中心的批量应用方法
    if (!registry || !registry.applyToGroup) {
      console.error('[IconBatchHelper] 注册中心不可用，无法执行批量应用');
      return [];
    }

    return registry.applyToGroup(groupId, styles, options);
  }

  /**
   * 交替应用样式（奇偶不同）- 调用注册中心的统一方法
   * @param {Object} registry - 注册中心实例
   * @param {string} groupId - 组ID
   * @param {Object} oddStyles - 奇数位置样式
   * @param {Object} evenStyles - 偶数位置样式
   */
  static applyAlternating(registry, groupId, oddStyles, evenStyles) {
    // ✅ 直接调用注册中心的applyToGroup方法，传入交替选项
    if (!registry || !registry.applyToGroup) {
      console.error('[IconBatchHelper] 注册中心不可用，无法执行交替应用');
      return [];
    }

    return registry.applyToGroup(groupId, {}, {
      alternating: true,
      oddStyles: oddStyles,
      evenStyles: evenStyles
    });
  }

  /**
   * 复制样式从一个图标到另一个或一组（重构版 - 调用注册中心方法）
   * @param {Object} registry - 注册中心实例
   * @param {string} sourceSelector - 源图标选择器
   * @param {Array} targetSelectors - 目标图标选择器数组
   */
  static copyStyles(registry, sourceSelector, targetSelectors) {
    // ✅ 统一调用注册中心的样式复制方法
    if (!registry || !registry.copyStylesToGroup) {
      console.error('[IconBatchHelper] 注册中心不可用，无法执行样式复制');
      return [];
    }

    if (!Array.isArray(targetSelectors)) {
      console.error('[IconBatchHelper] targetSelectors 必须是数组');
      return [];
    }

    return registry.copyStylesToGroup(sourceSelector, targetSelectors);
  }

  /**
   * 获取组的统计信息
   * @param {string} groupId - 组ID
   * @returns {Object} 统计信息
   */
  static getGroupStats(groupId) {
    const group = IconGroups[groupId];
    if (!group) return null;

    const elements = this.getGroupElements(groupId);
    const configured = elements.filter(el => {
      const domEl = document.querySelector(el.selector);
      return domEl && domEl._iconData && domEl._iconData.backgroundImage;
    });

    return {
      name: group.name,
      description: group.description,
      total: elements.length,
      configured: configured.length,
      unconfigured: elements.length - configured.length,
      hasSubGroups: !!group.subGroups
    };
  }
}

/**
 * 注册图标元素到注册中心
 * @param {Object} registry - 元素注册中心实例
 */
export function registerIconElements(registry) {
  // 注册所有图标元素
  IconElements.forEach(element => {
    if (!element.selector || !element.displayName) {
      console.error('[IconElements] 元素配置不完整:', element);
      return;
    }

    if (!element.category) {
      element.category = 'icons';
    }

    const success = registry.registerElement(element);
    if (success) {
    } else {
      console.error(`[IconElements] 注册失败: ${element.displayName}`);
    }
  });

  // 注册批量操作支持
  registry.registerIconGroups = function (groups) {
    this.iconGroups = groups;
  };

  // 注册图标组
  registry.registerIconGroups(IconGroups);

}

/**
 * 导出默认注册函数
 */
export default function registerIcons(registry) {
  registerIconElements(registry);
  return {
    IconBatchHelper,
    IconGroups,
    IconElements
  };
}