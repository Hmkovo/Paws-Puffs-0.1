/**
 * 可视化CSS编辑器 - 通用元素定义
 * 功能：定义通用界面元素的可编辑属性
 * 
 * 创建时间：2025-09-07
 */

export const CommonElements = [
  // 顶部栏
  {
    selector: '#top-bar',
    displayName: '顶部导航栏',
    category: 'layout',
    editableProperties: {
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: '#343a40',
        category: 'basic'
      },
      'color': {
        type: 'color',
        label: '文字颜色',
        defaultValue: '#ffffff',
        category: 'text'
      },
      'height': {
        type: 'slider',
        label: '高度',
        defaultValue: 50,
        min: 40,
        max: 80,
        step: 5,
        unit: 'px',
        category: 'basic'
      },
      'padding': {
        type: 'text',
        label: '内边距',
        defaultValue: '0 15px',
        placeholder: '上下 左右',
        category: 'spacing'
      },
      'box-shadow': {
        type: 'text',
        label: '阴影',
        defaultValue: '0 2px 4px rgba(0,0,0,0.1)',
        placeholder: 'x y blur color',
        category: 'effects'
      },
      'position': {
        type: 'select',
        label: '定位方式',
        defaultValue: 'fixed',
        options: [
          { value: 'static', label: '默认' },
          { value: 'fixed', label: '固定' },
          { value: 'sticky', label: '粘性' }
        ],
        category: 'advanced'
      }
    }
  },

  // 侧边栏
  {
    selector: '.drawer-content',
    displayName: '侧边栏',
    category: 'layout',
    editableProperties: {
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: '#f8f9fa',
        category: 'basic'
      },
      'width': {
        type: 'slider',
        label: '宽度',
        defaultValue: 250,
        min: 200,
        max: 400,
        step: 10,
        unit: 'px',
        category: 'basic'
      },
      'padding': {
        type: 'slider',
        label: '内边距',
        defaultValue: 15,
        min: 10,
        max: 30,
        step: 5,
        unit: 'px',
        category: 'spacing'
      },
      'border-right': {
        type: 'text',
        label: '右边框',
        defaultValue: '1px solid #dee2e6',
        placeholder: '1px solid #color',
        category: 'border'
      }
    }
  },

  // 通用按钮
  {
    selector: '.menu_button',
    displayName: '通用按钮',
    category: 'controls',
    editableProperties: {
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: '#007bff',
        category: 'basic'
      },
      'color': {
        type: 'color',
        label: '文字颜色',
        defaultValue: '#ffffff',
        category: 'text'
      },
      'padding': {
        type: 'text',
        label: '内边距',
        defaultValue: '6px 12px',
        placeholder: '上下 左右',
        category: 'spacing'
      },
      'border': {
        type: 'text',
        label: '边框',
        defaultValue: 'none',
        placeholder: '1px solid #color',
        category: 'border'
      },
      'border-radius': {
        type: 'slider',
        label: '圆角',
        defaultValue: 4,
        min: 0,
        max: 20,
        step: 1,
        unit: 'px',
        category: 'border'
      },
      'font-size': {
        type: 'slider',
        label: '字体大小',
        defaultValue: 14,
        min: 12,
        max: 18,
        step: 1,
        unit: 'px',
        category: 'text'
      },
      'font-weight': {
        type: 'select',
        label: '字体粗细',
        defaultValue: 'normal',
        options: [
          { value: 'normal', label: '正常' },
          { value: '500', label: '中等' },
          { value: 'bold', label: '粗体' }
        ],
        category: 'text'
      },
      'transition': {
        type: 'text',
        label: '过渡效果',
        defaultValue: 'all 0.3s ease',
        placeholder: 'property duration timing',
        category: 'effects'
      },
      'cursor': {
        type: 'select',
        label: '鼠标样式',
        defaultValue: 'pointer',
        options: [
          { value: 'default', label: '默认' },
          { value: 'pointer', label: '手型' }
        ],
        category: 'advanced'
      }
    }
  },

  // 弹窗
  {
    selector: '.popup',
    displayName: '弹窗',
    category: 'popup',
    editableProperties: {
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: '#ffffff',
        category: 'basic'
      },
      'border-radius': {
        type: 'slider',
        label: '圆角',
        defaultValue: 8,
        min: 0,
        max: 20,
        step: 1,
        unit: 'px',
        category: 'border'
      },
      'padding': {
        type: 'slider',
        label: '内边距',
        defaultValue: 20,
        min: 10,
        max: 40,
        step: 5,
        unit: 'px',
        category: 'spacing'
      },
      'box-shadow': {
        type: 'text',
        label: '阴影',
        defaultValue: '0 10px 40px rgba(0,0,0,0.2)',
        placeholder: 'x y blur color',
        category: 'effects'
      },
      'width': {
        type: 'text',
        label: '宽度',
        defaultValue: '500px',
        placeholder: 'px, %, vw',
        category: 'basic'
      },
      'max-width': {
        type: 'text',
        label: '最大宽度',
        defaultValue: '90vw',
        placeholder: 'px, %, vw',
        category: 'basic'
      }
    }
  },

  // 滑动按钮
  {
    selector: '.swipe_left, .swipe_right',
    displayName: '滑动按钮',
    category: 'controls',
    editableProperties: {
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: 'rgba(255,255,255,0.8)',
        category: 'basic'
      },
      'color': {
        type: 'color',
        label: '文字颜色',
        defaultValue: '#333333',
        category: 'text'
      },
      'width': {
        type: 'slider',
        label: '宽度',
        defaultValue: 30,
        min: 20,
        max: 50,
        step: 5,
        unit: 'px',
        category: 'basic'
      },
      'height': {
        type: 'slider',
        label: '高度',
        defaultValue: 30,
        min: 20,
        max: 50,
        step: 5,
        unit: 'px',
        category: 'basic'
      },
      'border-radius': {
        type: 'slider',
        label: '圆角',
        defaultValue: 50,
        min: 0,
        max: 50,
        step: 5,
        unit: '%',
        category: 'border'
      },
      'opacity': {
        type: 'slider',
        label: '透明度',
        defaultValue: 0.7,
        min: 0,
        max: 1,
        step: 0.1,
        unit: '',
        category: 'basic'
      },
      'font-size': {
        type: 'slider',
        label: '图标大小',
        defaultValue: 16,
        min: 12,
        max: 24,
        step: 1,
        unit: 'px',
        category: 'text'
      }
    }
  },

  // 标签页
  {
    selector: '.tab',
    displayName: '标签页',
    category: 'controls',
    editableProperties: {
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: 'transparent',
        category: 'basic'
      },
      'color': {
        type: 'color',
        label: '文字颜色',
        defaultValue: '#495057',
        category: 'text'
      },
      'padding': {
        type: 'text',
        label: '内边距',
        defaultValue: '8px 16px',
        placeholder: '上下 左右',
        category: 'spacing'
      },
      'border-bottom': {
        type: 'text',
        label: '底部边框',
        defaultValue: '2px solid transparent',
        placeholder: '2px solid #color',
        category: 'border'
      },
      'font-size': {
        type: 'slider',
        label: '字体大小',
        defaultValue: 14,
        min: 12,
        max: 16,
        step: 1,
        unit: 'px',
        category: 'text'
      },
      'transition': {
        type: 'text',
        label: '过渡效果',
        defaultValue: 'all 0.3s ease',
        placeholder: 'property duration timing',
        category: 'effects'
      }
    }
  },

  // 滚动条
  {
    selector: '::-webkit-scrollbar',
    displayName: '滚动条',
    category: 'controls',
    editableProperties: {
      'width': {
        type: 'slider',
        label: '宽度',
        defaultValue: 8,
        min: 4,
        max: 16,
        step: 1,
        unit: 'px',
        category: 'basic'
      },
      'background': {
        type: 'color',
        label: '背景颜色',
        defaultValue: '#f1f1f1',
        category: 'basic'
      }
    }
  },

  // 滚动条滑块
  {
    selector: '::-webkit-scrollbar-thumb',
    displayName: '滚动条滑块',
    category: 'controls',
    editableProperties: {
      'background': {
        type: 'color',
        label: '滑块颜色',
        defaultValue: '#888888',
        category: 'basic'
      },
      'border-radius': {
        type: 'slider',
        label: '圆角',
        defaultValue: 4,
        min: 0,
        max: 10,
        step: 1,
        unit: 'px',
        category: 'border'
      }
    }
  },

  // 主体背景
  {
    selector: 'body',
    displayName: '页面背景',
    category: 'layout',
    editableProperties: {
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: '#ffffff',
        category: 'basic'
      },
      'background-image': {
        type: 'text',
        label: '背景图片',
        defaultValue: '',
        placeholder: 'url(图片地址)',
        category: 'basic'
      },
      'background-size': {
        type: 'select',
        label: '背景大小',
        defaultValue: 'cover',
        options: [
          { value: 'auto', label: '原始大小' },
          { value: 'cover', label: '覆盖' },
          { value: 'contain', label: '包含' }
        ],
        category: 'basic'
      },
      'background-position': {
        type: 'select',
        label: '背景位置',
        defaultValue: 'center',
        options: [
          { value: 'center', label: '居中' },
          { value: 'top', label: '顶部' },
          { value: 'bottom', label: '底部' },
          { value: 'left', label: '左侧' },
          { value: 'right', label: '右侧' }
        ],
        category: 'basic'
      },
      'color': {
        type: 'color',
        label: '默认文字颜色',
        defaultValue: '#212529',
        category: 'text'
      },
      'font-family': {
        type: 'text',
        label: '字体',
        defaultValue: 'system-ui, -apple-system, sans-serif',
        placeholder: '字体名称',
        category: 'text'
      }
    }
  }
];

/**
 * 注册通用元素
 */
export function registerCommonElements(registry) {
  CommonElements.forEach(element => {
    registry.registerElement(element);
  });
}