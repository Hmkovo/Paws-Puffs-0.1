/**
 * 可视化CSS编辑器 - 元素初始化器
 * 功能：统一注册所有可编辑元素
 * 
 * 创建时间：2025-09-07
 */

import { registerChatElements } from './visual-editor-elements-chat.js';
import { registerCommonElements } from './visual-editor-elements-common.js';
import { registerIconElements } from './visual-editor-elements-icons.js';

/**
 * 初始化所有元素
 */
export function initializeAllElements(registry) {

  // 注册各类元素
  registerChatElements(registry);
  registerCommonElements(registry);
  registerIconElements(registry);

  // 统计信息
  const stats = registry.getStats();

  return stats;
}

/**
 * 获取元素分类配置
 */
export function getElementCategories() {
  return {
    message: {
      label: '消息相关',
      icon: 'fa-comments',
      description: '聊天消息、头像、角色名称等'
    },
    layout: {
      label: '布局',
      icon: 'fa-th-large',
      description: '页面布局、容器等'
    },
    controls: {
      label: '控件',
      icon: 'fa-sliders-h',
      description: '按钮、滑块、标签页等'
    },
    popup: {
      label: '弹窗',
      icon: 'fa-window-restore',
      description: '弹窗、模态框等'
    },
    icons: {
      label: '图标替换',
      icon: 'fa-icons',
      description: '替换UI图标为自定义图片'
    }
  };
}

/**
 * 快速样式模板
 */
export const QuickStyleTemplates = {
  // 深色主题模板
  darkTheme: {
    name: '深色主题',
    styles: {
      'body': {
        'background-color': '#1a1a1a',
        'color': '#e0e0e0'
      },
      '.mes_block': {
        'background-color': '#2a2a2a',
        'border': '1px solid #3a3a3a'
      },
      '#send_textarea': {
        'background-color': '#2a2a2a',
        'color': '#e0e0e0',
        'border': '1px solid #3a3a3a'
      },
      '.menu_button': {
        'background-color': '#3a3a3a',
        'color': '#e0e0e0'
      }
    }
  },

  // 柔和主题模板
  softTheme: {
    name: '柔和主题',
    styles: {
      'body': {
        'background-color': '#f5f5f5'
      },
      '.mes_block': {
        'background-color': '#ffffff',
        'border-radius': '12px',
        'box-shadow': '0 2px 8px rgba(0,0,0,0.05)'
      },
      '.mes_text': {
        'line-height': '1.6'
      },
      '#send_textarea': {
        'border-radius': '8px',
        'border': '2px solid #e0e0e0'
      }
    }
  },

  // 高对比度模板
  highContrast: {
    name: '高对比度',
    styles: {
      'body': {
        'background-color': '#000000',
        'color': '#ffffff'
      },
      '.mes_block': {
        'background-color': '#111111',
        'border': '2px solid #ffffff'
      },
      '.mes_text': {
        'color': '#ffffff',
        'font-size': '16px'
      },
      '#send_textarea': {
        'background-color': '#111111',
        'color': '#ffffff',
        'border': '2px solid #ffffff'
      }
    }
  },

  // 紧凑布局模板
  compactLayout: {
    name: '紧凑布局',
    styles: {
      '.mes_block': {
        'padding': '8px',
        'margin-bottom': '4px'
      },
      '.avatar img': {
        'width': '30px',
        'height': '30px'
      },
      '.ch_name': {
        'font-size': '12px',
        'margin-bottom': '2px'
      },
      '.mes_text': {
        'font-size': '13px'
      },
      '#send_textarea': {
        'min-height': '40px',
        'padding': '6px'
      }
    }
  },

  // 宽松布局模板
  spaciousLayout: {
    name: '宽松布局',
    styles: {
      '.mes_block': {
        'padding': '20px',
        'margin-bottom': '15px'
      },
      '.avatar img': {
        'width': '60px',
        'height': '60px'
      },
      '.ch_name': {
        'font-size': '18px',
        'margin-bottom': '10px'
      },
      '.mes_text': {
        'font-size': '16px',
        'line-height': '1.8'
      },
      '#send_textarea': {
        'min-height': '80px',
        'padding': '12px',
        'font-size': '16px'
      }
    }
  }
};

/**
 * 元素选择器帮助器
 */
export class ElementSelectorHelper {
  constructor(registry) {
    this.registry = registry;
  }

  /**
   * 获取相似元素
   */
  getSimilarElements(selector) {
    const element = this.registry.getElement(selector);
    if (!element) return [];

    // 获取同类别的元素
    return this.registry.getElementsByCategory(element.category)
      .filter(el => el.selector !== selector);
  }

  /**
   * 获取关联元素
   */
  getRelatedElements(selector) {
    const relations = {
      '.mes_block': ['.mes_text', '.ch_name', '.avatar img'],
      '#send_textarea': ['#send_but', '#send_form'],
      '.character_select': ['.character_name', '.character_description'],
      '.world_entry': ['.world_entry_title', '.world_entry_content']
    };

    return relations[selector] || [];
  }

  /**
   * 批量应用样式
   */
  applyToMultiple(selectors, property, value) {
    const results = [];

    for (const selector of selectors) {
      const element = this.registry.getElement(selector);
      if (element) {
        results.push({
          selector,
          success: true,
          element
        });
      } else {
        results.push({
          selector,
          success: false,
          error: '元素未注册'
        });
      }
    }

    return results;
  }

  /**
   * 搜索元素
   */
  searchElements(keyword) {
    return this.registry.searchElements(keyword);
  }

  /**
   * 获取推荐样式
   */
  getRecommendedStyles(selector) {
    const element = this.registry.getElement(selector);
    if (!element) return {};

    const recommendations = {};

    // 基于元素类型推荐样式
    for (const [prop, config] of Object.entries(element.editableProperties)) {
      if (config.defaultValue) {
        recommendations[prop] = config.defaultValue;
      }
    }

    return recommendations;
  }
}

/**
 * 导出默认初始化函数
 */
export default function initializeVisualEditor(registry) {
  // 初始化所有元素
  initializeAllElements(registry);

  // 创建帮助器
  const helper = new ElementSelectorHelper(registry);

  return {
    registry,
    helper,
    categories: getElementCategories(),
    templates: QuickStyleTemplates
  };
}