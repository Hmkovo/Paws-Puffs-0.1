/**
 * 可视化CSS编辑器解析器模块
 * 功能：解析现有CSS样式，转换为可编辑的数据结构
 * 
 * 创建时间：2025-09-06
 */

export class VisualEditorParser {
  constructor(module) {
    this.module = module;

    // CSS属性分类映射
    this.propertyCategories = {
      basic: [
        'background-color', 'background-image', 'background',
        'color', 'opacity', 'visibility', 'display'
      ],
      spacing: [
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'gap', 'row-gap', 'column-gap'
      ],
      border: [
        'border', 'border-width', 'border-style', 'border-color',
        'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-radius', 'border-top-left-radius', 'border-top-right-radius',
        'border-bottom-left-radius', 'border-bottom-right-radius',
        'outline', 'outline-width', 'outline-style', 'outline-color'
      ],
      effects: [
        'box-shadow', 'text-shadow', 'filter', 'backdrop-filter',
        'transform', 'transition', 'animation'
      ],
      text: [
        'font-family', 'font-size', 'font-weight', 'font-style',
        'line-height', 'letter-spacing', 'text-align', 'text-decoration',
        'text-transform', 'word-spacing', 'white-space'
      ],
      layout: [
        'position', 'top', 'right', 'bottom', 'left',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'z-index', 'overflow', 'overflow-x', 'overflow-y'
      ]
    };
  }

  /**
   * 从CSS文本解析规则
   */
  parseCSSText(cssText) {
    const rules = new Map();

    // 简单的CSS解析器
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(cssText)) !== null) {
      const selector = match[1].trim();
      const declarations = match[2].trim();

      if (selector && declarations) {
        const properties = this.parseDeclarations(declarations);
        if (Object.keys(properties).length > 0) {
          rules.set(selector, properties);
        }
      }
    }

    return rules;
  }

  /**
   * 解析CSS声明
   */
  parseDeclarations(declarations) {
    const properties = {};

    // 分割声明
    const parts = declarations.split(';').filter(p => p.trim());

    for (const part of parts) {
      const colonIndex = part.indexOf(':');
      if (colonIndex > 0) {
        const property = part.substring(0, colonIndex).trim();
        const value = part.substring(colonIndex + 1).trim();

        if (property && value) {
          properties[property] = this.normalizeValue(value);
        }
      }
    }

    return properties;
  }

  /**
   * 规范化CSS值
   */
  normalizeValue(value) {
    // 移除!important
    value = value.replace(/\s*!important\s*$/, '');

    // 移除多余的空格
    value = value.trim().replace(/\s+/g, ' ');

    // 规范化引号
    value = value.replace(/["']/g, '"');

    return value;
  }

  /**
   * 从DOM元素提取计算样式
   */
  extractComputedStyles(selector, propertyList = null) {
    const element = document.querySelector(selector);
    if (!element) return {};

    const computed = window.getComputedStyle(element);
    const styles = {};

    // 如果指定了属性列表，只提取这些属性
    if (propertyList && Array.isArray(propertyList)) {
      for (const prop of propertyList) {
        const value = computed.getPropertyValue(prop);
        if (value && value !== 'initial' && value !== 'inherit' && value !== 'unset') {
          styles[prop] = value;
        }
      }
    } else {
      // 提取所有分类中的属性
      for (const category in this.propertyCategories) {
        for (const prop of this.propertyCategories[category]) {
          const value = computed.getPropertyValue(prop);
          if (value && value !== 'initial' && value !== 'inherit' && value !== 'unset') {
            styles[prop] = value;
          }
        }
      }
    }

    return this.cleanupStyles(styles);
  }

  /**
   * 清理和优化样式
   */
  cleanupStyles(styles) {
    const cleaned = {};

    for (const [prop, value] of Object.entries(styles)) {
      // 跳过默认值
      if (this.isDefaultValue(prop, value)) {
        continue;
      }

      // 转换颜色格式
      if (this.isColorProperty(prop)) {
        cleaned[prop] = this.normalizeColor(value);
      }
      // 转换尺寸单位
      else if (this.isSizeProperty(prop)) {
        cleaned[prop] = this.normalizeSize(value);
      }
      // 其他属性直接保留
      else {
        cleaned[prop] = value;
      }
    }

    return cleaned;
  }

  /**
   * 判断是否为默认值
   */
  isDefaultValue(property, value) {
    const defaults = {
      'background-color': ['transparent', 'rgba(0, 0, 0, 0)'],
      'border': ['none', '0px none', 'medium none'],
      'margin': ['0px', '0'],
      'padding': ['0px', '0'],
      'opacity': ['1'],
      'display': ['block', 'inline'],
      'position': ['static'],
      'box-shadow': ['none'],
      'text-shadow': ['none']
    };

    if (defaults[property]) {
      return defaults[property].includes(value);
    }

    return false;
  }

  /**
   * 判断是否为颜色属性
   */
  isColorProperty(property) {
    return property.includes('color') ||
      property === 'background' ||
      property.includes('border') && !property.includes('width') && !property.includes('style');
  }

  /**
   * 判断是否为尺寸属性
   */
  isSizeProperty(property) {
    return property.includes('width') ||
      property.includes('height') ||
      property.includes('padding') ||
      property.includes('margin') ||
      property.includes('radius') ||
      property.includes('size') ||
      ['top', 'right', 'bottom', 'left', 'gap'].includes(property);
  }

  /**
   * 规范化颜色值
   */
  normalizeColor(color) {
    // RGB/RGBA转换为HEX
    if (color.startsWith('rgb')) {
      return this.rgbToHex(color);
    }

    // 保持HEX格式
    if (color.startsWith('#')) {
      return color;
    }

    // 颜色名称转换为HEX
    const namedColors = {
      'white': '#ffffff',
      'black': '#000000',
      'red': '#ff0000',
      'green': '#008000',
      'blue': '#0000ff',
      'transparent': 'transparent'
    };

    return namedColors[color.toLowerCase()] || color;
  }

  /**
   * RGB转HEX
   */
  rgbToHex(rgb) {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return rgb;

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const a = match[4] ? parseFloat(match[4]) : 1;

    if (a < 1) {
      // 保持RGBA格式
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    const toHex = (n) => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  /**
   * 规范化尺寸值
   */
  normalizeSize(size) {
    // 如果是纯数字，添加px单位
    if (/^\d+$/.test(size)) {
      return size + 'px';
    }

    // 0值不需要单位
    if (size === '0' || size === '0px') {
      return '0';
    }

    return size;
  }

  /**
   * 分析CSS优先级
   */
  calculateSpecificity(selector) {
    let a = 0, b = 0, c = 0;

    // 计算ID选择器
    const ids = selector.match(/#[\w-]+/g);
    if (ids) a = ids.length;

    // 计算类选择器、属性选择器、伪类
    const classes = selector.match(/\.[\w-]+|\[[\w-]+.*?\]|:[\w-]+/g);
    if (classes) b = classes.length;

    // 计算元素选择器、伪元素
    const elements = selector.match(/^[\w-]+|[\s>+~][\w-]+|::[\w-]+/g);
    if (elements) c = elements.length;

    return a * 100 + b * 10 + c;
  }

  /**
   * 合并样式规则
   */
  mergeStyles(base, override) {
    return { ...base, ...override };
  }

  /**
   * 验证CSS属性值
   */
  validateProperty(property, value) {
    // 创建临时元素测试
    const testEl = document.createElement('div');
    testEl.style[property] = value;

    return testEl.style[property] !== '';
  }

  /**
   * 获取属性的类别
   */
  getPropertyCategory(property) {
    for (const [category, properties] of Object.entries(this.propertyCategories)) {
      if (properties.includes(property)) {
        return category;
      }
    }
    return 'advanced';
  }

  /**
   * 分解复合属性
   */
  expandShorthand(property, value) {
    const expanded = {};

    switch (property) {
      case 'padding':
      case 'margin':
        const parts = value.split(/\s+/);
        if (parts.length === 1) {
          expanded[`${property}-top`] = parts[0];
          expanded[`${property}-right`] = parts[0];
          expanded[`${property}-bottom`] = parts[0];
          expanded[`${property}-left`] = parts[0];
        } else if (parts.length === 2) {
          expanded[`${property}-top`] = parts[0];
          expanded[`${property}-bottom`] = parts[0];
          expanded[`${property}-right`] = parts[1];
          expanded[`${property}-left`] = parts[1];
        } else if (parts.length === 3) {
          expanded[`${property}-top`] = parts[0];
          expanded[`${property}-right`] = parts[1];
          expanded[`${property}-left`] = parts[1];
          expanded[`${property}-bottom`] = parts[2];
        } else if (parts.length === 4) {
          expanded[`${property}-top`] = parts[0];
          expanded[`${property}-right`] = parts[1];
          expanded[`${property}-bottom`] = parts[2];
          expanded[`${property}-left`] = parts[3];
        }
        break;

      case 'border':
        const borderParts = value.match(/^(\S+)\s+(\S+)\s+(.+)$/);
        if (borderParts) {
          expanded['border-width'] = borderParts[1];
          expanded['border-style'] = borderParts[2];
          expanded['border-color'] = borderParts[3];
        }
        break;

      case 'border-radius':
        const radiusParts = value.split(/\s+/);
        if (radiusParts.length === 1) {
          expanded['border-top-left-radius'] = radiusParts[0];
          expanded['border-top-right-radius'] = radiusParts[0];
          expanded['border-bottom-right-radius'] = radiusParts[0];
          expanded['border-bottom-left-radius'] = radiusParts[0];
        }
        break;

      default:
        expanded[property] = value;
    }

    return expanded;
  }

  /**
   * 合并分解的属性
   */
  combineShorthand(properties) {
    const combined = { ...properties };

    // 尝试合并padding
    if (properties['padding-top'] && properties['padding-right'] &&
      properties['padding-bottom'] && properties['padding-left']) {
      const t = properties['padding-top'];
      const r = properties['padding-right'];
      const b = properties['padding-bottom'];
      const l = properties['padding-left'];

      if (t === r && t === b && t === l) {
        combined.padding = t;
        delete combined['padding-top'];
        delete combined['padding-right'];
        delete combined['padding-bottom'];
        delete combined['padding-left'];
      }
    }

    // 尝试合并margin
    if (properties['margin-top'] && properties['margin-right'] &&
      properties['margin-bottom'] && properties['margin-left']) {
      const t = properties['margin-top'];
      const r = properties['margin-right'];
      const b = properties['margin-bottom'];
      const l = properties['margin-left'];

      if (t === r && t === b && t === l) {
        combined.margin = t;
        delete combined['margin-top'];
        delete combined['margin-right'];
        delete combined['margin-bottom'];
        delete combined['margin-left'];
      }
    }

    return combined;
  }
}