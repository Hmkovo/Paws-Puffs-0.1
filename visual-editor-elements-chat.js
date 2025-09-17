/**
 * 可视化CSS编辑器 - 聊天区元素定义
 * 功能：定义聊天相关元素的可编辑属性
 * 
 * 创建时间：2025-09-07
 */

export const ChatElements = [
  // 用户消息气泡
  {
    selector: '.mes[is_user="true"] .mes_block',
    displayName: '用户消息气泡',
    category: 'message',
    editableProperties: {
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: '#e3f2fd',
        category: 'basic'
      },
      'border-radius': {
        type: 'slider',
        label: '圆角',
        defaultValue: 8,
        min: 0,
        max: 30,
        step: 1,
        unit: 'px',
        category: 'border'
      },
      'padding': {
        type: 'slider',
        label: '内边距',
        defaultValue: 10,
        min: 0,
        max: 30,
        step: 1,
        unit: 'px',
        category: 'spacing'
      },
      'border': {
        type: 'text',
        label: '边框',
        defaultValue: '1px solid #90caf9',
        placeholder: '1px solid #color',
        category: 'border'
      },
      'box-shadow': {
        type: 'text',
        label: '阴影',
        defaultValue: '0 2px 4px rgba(0,0,0,0.1)',
        placeholder: 'x y blur color',
        category: 'effects'
      }
    }
  },

  // AI消息气泡
  {
    selector: '.mes[is_user="false"] .mes_block',
    displayName: 'AI消息气泡',
    category: 'message',
    editableProperties: {
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: '#f5f5f5',
        category: 'basic'
      },
      'border-radius': {
        type: 'slider',
        label: '圆角',
        defaultValue: 8,
        min: 0,
        max: 30,
        step: 1,
        unit: 'px',
        category: 'border'
      },
      'padding': {
        type: 'slider',
        label: '内边距',
        defaultValue: 10,
        min: 0,
        max: 30,
        step: 1,
        unit: 'px',
        category: 'spacing'
      },
      'border': {
        type: 'text',
        label: '边框',
        defaultValue: '1px solid #e0e0e0',
        placeholder: '1px solid #color',
        category: 'border'
      },
      'box-shadow': {
        type: 'text',
        label: '阴影',
        defaultValue: '0 2px 4px rgba(0,0,0,0.1)',
        placeholder: 'x y blur color',
        category: 'effects'
      }
    }
  },

  // 用户头像
  {
    selector: '.mes[is_user="true"] .avatar',
    displayName: '聊天区域 - 用户头像',
    category: 'message',
    editableProperties: {
      // 布局控制
      'avatar-layout-mode': {
        type: 'select',
        label: '布局模式',
        defaultValue: 'none',
        options: [
          { value: 'none', label: '无（不改变布局）' },
          { value: 'squeeze', label: '挤压文字模式（影响布局）' },
          { value: 'overlay', label: '悬浮模式（覆盖在上层）' }
        ],
        category: 'layout'
      },
      'avatar-position': {
        type: 'select',
        label: '头像位置',
        defaultValue: 'right-bottom',
        options: [
          { value: 'top-left', label: '顶部-左' },
          { value: 'top-center', label: '顶部-中' },
          { value: 'top-right', label: '顶部-右' },
          { value: 'left-top', label: '左边-上' },
          { value: 'left-middle', label: '左边-中' },
          { value: 'left-bottom', label: '左边-下' },
          { value: 'right-top', label: '右边-上' },
          { value: 'right-middle', label: '右边-中' },
          { value: 'right-bottom', label: '右边-下' },
          { value: 'bottom-left', label: '底部-左' },
          { value: 'bottom-center', label: '底部-中' },
          { value: 'bottom-right', label: '底部-右' }
        ],
        category: 'layout'
      },
      'avatar-offset-x': {
        type: 'slider',
        label: '水平偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 5,
        unit: 'px',
        category: 'layout'
      },
      'avatar-offset-y': {
        type: 'slider',
        label: '垂直偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 5,
        unit: 'px',
        category: 'layout'
      },
      'avatar-rotate': {
        type: 'slider',
        label: '旋转角度',
        defaultValue: 0,
        min: -45,
        max: 45,
        step: 1,
        unit: 'deg',
        category: 'layout'
      },

      // 基础样式
      'border-radius': {
        type: 'slider',
        label: '头像圆角',
        defaultValue: 50,
        min: 0,
        max: 50,
        step: 5,
        unit: '%',
        category: 'border'
      },
      'width': {
        type: 'slider',
        label: '头像宽度',
        defaultValue: 40,
        min: 20,
        max: 80,
        step: 5,
        unit: 'px',
        category: 'basic'
      },
      'height': {
        type: 'slider',
        label: '头像高度',
        defaultValue: 40,
        min: 20,
        max: 80,
        step: 5,
        unit: 'px',
        category: 'basic'
      },
      'border': {
        type: 'text',
        label: '头像边框',
        defaultValue: '2px solid #2196F3',
        placeholder: '2px solid #color',
        category: 'border'
      },
      'box-shadow': {
        type: 'text',
        label: '头像阴影',
        defaultValue: '0 2px 4px rgba(33,150,243,0.3)',
        placeholder: 'x y blur color',
        category: 'effects'
      }
    }
  },

  // AI角色头像
  {
    selector: '.mes[is_user="false"] .avatar',
    displayName: '聊天区域 - AI角色头像',
    category: 'message',
    editableProperties: {
      // 布局控制
      'avatar-layout-mode': {
        type: 'select',
        label: '布局模式',
        defaultValue: 'none',
        options: [
          { value: 'none', label: '无（不改变布局）' },
          { value: 'squeeze', label: '挤压文字模式（影响布局）' },
          { value: 'overlay', label: '悬浮模式（覆盖在上层）' }
        ],
        category: 'layout'
      },
      'avatar-position': {
        type: 'select',
        label: '头像位置',
        defaultValue: 'left-top',
        options: [
          { value: 'top-left', label: '顶部-左' },
          { value: 'top-center', label: '顶部-中' },
          { value: 'top-right', label: '顶部-右' },
          { value: 'left-top', label: '左边-上' },
          { value: 'left-middle', label: '左边-中' },
          { value: 'left-bottom', label: '左边-下' },
          { value: 'right-top', label: '右边-上' },
          { value: 'right-middle', label: '右边-中' },
          { value: 'right-bottom', label: '右边-下' },
          { value: 'bottom-left', label: '底部-左' },
          { value: 'bottom-center', label: '底部-中' },
          { value: 'bottom-right', label: '底部-右' }
        ],
        category: 'layout'
      },
      'avatar-offset-x': {
        type: 'slider',
        label: '水平偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 5,
        unit: 'px',
        category: 'layout'
      },
      'avatar-offset-y': {
        type: 'slider',
        label: '垂直偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 5,
        unit: 'px',
        category: 'layout'
      },
      'avatar-rotate': {
        type: 'slider',
        label: '旋转角度',
        defaultValue: 0,
        min: -45,
        max: 45,
        step: 1,
        unit: 'deg',
        category: 'layout'
      },

      // 基础样式
      'border-radius': {
        type: 'slider',
        label: '头像圆角',
        defaultValue: 50,
        min: 0,
        max: 50,
        step: 5,
        unit: '%',
        category: 'border'
      },
      'width': {
        type: 'slider',
        label: '头像宽度',
        defaultValue: 40,
        min: 20,
        max: 80,
        step: 5,
        unit: 'px',
        category: 'basic'
      },
      'height': {
        type: 'slider',
        label: '头像高度',
        defaultValue: 40,
        min: 20,
        max: 80,
        step: 5,
        unit: 'px',
        category: 'basic'
      },
      'border': {
        type: 'text',
        label: '头像边框',
        defaultValue: '2px solid #9C27B0',
        placeholder: '2px solid #color',
        category: 'border'
      },
      'box-shadow': {
        type: 'text',
        label: '头像阴影',
        defaultValue: '0 2px 4px rgba(156,39,176,0.3)',
        placeholder: 'x y blur color',
        category: 'effects'
      }
    }
  },

  // 角色名称
  {
    selector: '.ch_name',
    displayName: '角色名称',
    category: 'message',
    editableProperties: {
      'color': {
        type: 'color',
        label: '文字颜色',
        defaultValue: '#333333',
        category: 'text'
      },
      'font-size': {
        type: 'slider',
        label: '字体大小',
        defaultValue: 14,
        min: 10,
        max: 20,
        step: 1,
        unit: 'px',
        category: 'text'
      },
      'font-weight': {
        type: 'select',
        label: '字体粗细',
        defaultValue: 'bold',
        options: [
          { value: 'normal', label: '正常' },
          { value: 'bold', label: '粗体' },
          { value: '500', label: '中等' },
          { value: '700', label: '加粗' }
        ],
        category: 'text'
      },
      'margin-bottom': {
        type: 'slider',
        label: '下边距',
        defaultValue: 5,
        min: 0,
        max: 20,
        step: 1,
        unit: 'px',
        category: 'spacing'
      }
    }
  },

  // 消息文本
  {
    selector: '.mes_text',
    displayName: '消息文本',
    category: 'message',
    editableProperties: {
      'color': {
        type: 'color',
        label: '文字颜色',
        defaultValue: '#000000',
        category: 'text'
      },
      'font-size': {
        type: 'slider',
        label: '字体大小',
        defaultValue: 14,
        min: 12,
        max: 20,
        step: 1,
        unit: 'px',
        category: 'text'
      },
      'line-height': {
        type: 'slider',
        label: '行高',
        defaultValue: 1.6,
        min: 1,
        max: 2.5,
        step: 0.1,
        unit: '',
        category: 'text'
      },
      'text-align': {
        type: 'select',
        label: '对齐方式',
        defaultValue: 'left',
        options: [
          { value: 'left', label: '左对齐' },
          { value: 'center', label: '居中' },
          { value: 'right', label: '右对齐' },
          { value: 'justify', label: '两端对齐' }
        ],
        category: 'text'
      }
    }
  },

  // 时间戳
  {
    selector: '.timestamp',
    displayName: '时间戳',
    category: 'message',
    editableProperties: {
      'color': {
        type: 'color',
        label: '文字颜色',
        defaultValue: '#999999',
        category: 'text'
      },
      'font-size': {
        type: 'slider',
        label: '字体大小',
        defaultValue: 11,
        min: 9,
        max: 14,
        step: 1,
        unit: 'px',
        category: 'text'
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
      }
    }
  },

  // 消息操作按钮
  {
    selector: '.mes_buttons',
    displayName: '消息操作按钮',
    category: 'message',
    editableProperties: {
      'opacity': {
        type: 'slider',
        label: '透明度',
        defaultValue: 0.6,
        min: 0,
        max: 1,
        step: 0.1,
        unit: '',
        category: 'basic'
      },
      'gap': {
        type: 'slider',
        label: '按钮间距',
        defaultValue: 5,
        min: 0,
        max: 15,
        step: 1,
        unit: 'px',
        category: 'spacing'
      }
    }
  },

  // 聊天容器
  {
    selector: '#chat',
    displayName: '聊天区域',
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
      'padding': {
        type: 'slider',
        label: '内边距',
        defaultValue: 10,
        min: 0,
        max: 30,
        step: 1,
        unit: 'px',
        category: 'spacing'
      }
    }
  },

  // ========================================
  // 📋 信息显示布局系统 (复用头像布局逻辑)
  // ========================================

  // 🔥 删除所有虚拟组设计 - 按用户要求全部使用单个元素控制

  // 用户消息ID显示
  {
    selector: '.mes[is_user="true"] .mesIDDisplay',
    displayName: '聊天区域 - 用户消息ID',
    category: 'message',
    editableProperties: {
      // 🔥 完整布局控制 (复用头像布局逻辑)
      'info-layout-mode': {
        type: 'select',
        label: '布局模式',
        defaultValue: 'none',
        options: [
          { value: 'none', label: '无（保持原位置）' },
          { value: 'squeeze', label: '挤压模式（影响布局）' },
          { value: 'overlay', label: '悬浮模式（覆盖在上层）' }
        ],
        category: 'layout'
      },
      'info-position': {
        type: 'select',
        label: '位置',
        defaultValue: 'bottom-left',
        options: [
          { value: 'top-left', label: '顶部-左' },
          { value: 'top-center', label: '顶部-中' },
          { value: 'top-right', label: '顶部-右' },
          { value: 'left-top', label: '左边-上' },
          { value: 'left-middle', label: '左边-中' },
          { value: 'left-bottom', label: '左边-下' },
          { value: 'right-top', label: '右边-上' },
          { value: 'right-middle', label: '右边-中' },
          { value: 'right-bottom', label: '右边-下' },
          { value: 'bottom-left', label: '底部-左' },
          { value: 'bottom-center', label: '底部-中' },
          { value: 'bottom-right', label: '底部-右' }
        ],
        category: 'layout'
      },
      'info-offset-x': {
        type: 'slider',
        label: '水平偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-offset-y': {
        type: 'slider',
        label: '垂直偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-rotate': {
        type: 'slider',
        label: '旋转角度',
        defaultValue: 0,
        min: -45,
        max: 45,
        step: 1,
        unit: 'deg',
        category: 'layout'
      },
      // 样式控制
      'visibility': {
        type: 'select',
        label: '显示状态',
        defaultValue: 'visible',
        options: [
          { value: 'visible', label: '显示' },
          { value: 'hidden', label: '隐藏' }
        ],
        category: 'basic'
      },
      'color': {
        type: 'color',
        label: '文字颜色',
        defaultValue: '#666666',
        category: 'text'
      },
      'font-size': {
        type: 'slider',
        label: '字体大小',
        defaultValue: 12,
        min: 8,
        max: 20,
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
          { value: 'bold', label: '粗体' }
        ],
        category: 'text'
      },
      'text-shadow': {
        type: 'text',
        label: '文字阴影',
        defaultValue: 'none',
        placeholder: 'x y blur color',
        category: 'text'
      },
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: 'transparent',
        category: 'background'
      },
      'border-radius': {
        type: 'slider',
        label: '圆角',
        defaultValue: 0,
        min: 0,
        max: 10,
        step: 1,
        unit: 'px',
        category: 'border'
      },
      'box-shadow': {
        type: 'text',
        label: '容器阴影',
        defaultValue: 'none',
        placeholder: 'x y blur color',
        category: 'effects'
      },
      'padding': {
        type: 'slider',
        label: '内边距',
        defaultValue: 2,
        min: 0,
        max: 10,
        step: 1,
        unit: 'px',
        category: 'spacing'
      }
    }
  },

  // 🔥 删除用户计时器 - 用户确认此元素不存在

  // 用户Token计数器显示
  {
    selector: '.mes[is_user="true"] .tokenCounterDisplay',
    displayName: '聊天区域 - 用户Token计数',
    category: 'message',
    editableProperties: {
      // 🔥 完整布局控制 (复用头像布局逻辑)
      'info-layout-mode': {
        type: 'select',
        label: '布局模式',
        defaultValue: 'none',
        options: [
          { value: 'none', label: '无（保持原位置）' },
          { value: 'squeeze', label: '挤压文字模式（影响布局）' },
          { value: 'overlay', label: '悬浮模式（覆盖在上层）' }
        ],
        category: 'layout'
      },
      'info-position': {
        type: 'select',
        label: '位置',
        defaultValue: 'bottom-left',
        options: [
          { value: 'top-left', label: '顶部-左' },
          { value: 'top-center', label: '顶部-中' },
          { value: 'top-right', label: '顶部-右' },
          { value: 'left-top', label: '左边-上' },
          { value: 'left-middle', label: '左边-中' },
          { value: 'left-bottom', label: '左边-下' },
          { value: 'right-top', label: '右边-上' },
          { value: 'right-middle', label: '右边-中' },
          { value: 'right-bottom', label: '右边-下' },
          { value: 'bottom-left', label: '底部-左' },
          { value: 'bottom-center', label: '底部-中' },
          { value: 'bottom-right', label: '底部-右' }
        ],
        category: 'layout'
      },
      'info-offset-x': {
        type: 'slider',
        label: '水平偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-offset-y': {
        type: 'slider',
        label: '垂直偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-rotate': {
        type: 'slider',
        label: '旋转角度',
        defaultValue: 0,
        min: -45,
        max: 45,
        step: 1,
        unit: 'deg',
        category: 'layout'
      },
      // 样式控制
      'visibility': {
        type: 'select',
        label: '显示状态',
        defaultValue: 'visible',
        options: [
          { value: 'visible', label: '显示' },
          { value: 'hidden', label: '隐藏' }
        ],
        category: 'basic'
      },
      'color': {
        type: 'color',
        label: '文字颜色',
        defaultValue: '#999999',
        category: 'text'
      },
      'font-size': {
        type: 'slider',
        label: '字体大小',
        defaultValue: 10,
        min: 8,
        max: 20,
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
          { value: 'bold', label: '粗体' }
        ],
        category: 'text'
      },
      'text-shadow': {
        type: 'text',
        label: '文字阴影',
        defaultValue: 'none',
        placeholder: 'x y blur color',
        category: 'text'
      },
      'background-color': {
        type: 'color',
        label: '背景颜色',
        defaultValue: 'transparent',
        category: 'background'
      },
      'border-radius': {
        type: 'slider',
        label: '圆角',
        defaultValue: 0,
        min: 0,
        max: 10,
        step: 1,
        unit: 'px',
        category: 'border'
      },
      'box-shadow': {
        type: 'text',
        label: '容器阴影',
        defaultValue: 'none',
        placeholder: 'x y blur color',
        category: 'effects'
      },
      'padding': {
        type: 'slider',
        label: '内边距',
        defaultValue: 2,
        min: 0,
        max: 10,
        step: 1,
        unit: 'px',
        category: 'spacing'
      }
    }
  },

  // AI消息ID显示
  {
    selector: '.mes[is_user="false"] .mesIDDisplay',
    displayName: '聊天区域 - AI消息ID',
    category: 'message',
    editableProperties: {
      // 🔥 完整布局控制 (复用头像布局逻辑)
      'info-layout-mode': {
        type: 'select',
        label: '布局模式',
        defaultValue: 'none',
        options: [
          { value: 'none', label: '无（保持原位置）' },
          { value: 'squeeze', label: '挤压文字模式（影响布局）' },
          { value: 'overlay', label: '悬浮模式（覆盖在上层）' }
        ],
        category: 'layout'
      },
      'info-position': {
        type: 'select',
        label: '位置',
        defaultValue: 'bottom-left',
        options: [
          { value: 'top-left', label: '顶部-左' },
          { value: 'top-center', label: '顶部-中' },
          { value: 'top-right', label: '顶部-右' },
          { value: 'left-top', label: '左边-上' },
          { value: 'left-middle', label: '左边-中' },
          { value: 'left-bottom', label: '左边-下' },
          { value: 'right-top', label: '右边-上' },
          { value: 'right-middle', label: '右边-中' },
          { value: 'right-bottom', label: '右边-下' },
          { value: 'bottom-left', label: '底部-左' },
          { value: 'bottom-center', label: '底部-中' },
          { value: 'bottom-right', label: '底部-右' }
        ],
        category: 'layout'
      },
      'info-offset-x': {
        type: 'slider',
        label: '水平偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-offset-y': {
        type: 'slider',
        label: '垂直偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-rotate': {
        type: 'slider',
        label: '旋转角度',
        defaultValue: 0,
        min: -45,
        max: 45,
        step: 1,
        unit: 'deg',
        category: 'layout'
      },
      // 样式控制
      'visibility': { type: 'select', label: '显示状态', defaultValue: 'visible', options: [{ value: 'visible', label: '显示' }, { value: 'hidden', label: '隐藏' }], category: 'basic' },
      'color': { type: 'color', label: '文字颜色', defaultValue: '#666666', category: 'text' },
      'font-size': { type: 'slider', label: '字体大小', defaultValue: 12, min: 8, max: 20, step: 1, unit: 'px', category: 'text' },
      'font-weight': { type: 'select', label: '字体粗细', defaultValue: 'normal', options: [{ value: 'normal', label: '正常' }, { value: 'bold', label: '粗体' }], category: 'text' },
      'text-shadow': { type: 'text', label: '文字阴影', defaultValue: 'none', placeholder: 'x y blur color', category: 'text' },
      'background-color': { type: 'color', label: '背景颜色', defaultValue: 'transparent', category: 'background' },
      'border-radius': { type: 'slider', label: '圆角', defaultValue: 0, min: 0, max: 10, step: 1, unit: 'px', category: 'border' },
      'box-shadow': { type: 'text', label: '容器阴影', defaultValue: 'none', placeholder: 'x y blur color', category: 'effects' },
      'padding': { type: 'slider', label: '内边距', defaultValue: 2, min: 0, max: 10, step: 1, unit: 'px', category: 'spacing' }
    }
  },

  // AI计时器显示
  {
    selector: '.mes[is_user="false"] .mes_timer',
    displayName: '聊天区域 - AI计时器',
    category: 'message',
    editableProperties: {
      // 🔥 完整布局控制 (复用头像布局逻辑)
      'info-layout-mode': {
        type: 'select',
        label: '布局模式',
        defaultValue: 'none',
        options: [
          { value: 'none', label: '无（保持原位置）' },
          { value: 'squeeze', label: '挤压文字模式（影响布局）' },
          { value: 'overlay', label: '悬浮模式（覆盖在上层）' }
        ],
        category: 'layout'
      },
      'info-position': {
        type: 'select',
        label: '位置',
        defaultValue: 'bottom-left',
        options: [
          { value: 'top-left', label: '顶部-左' },
          { value: 'top-center', label: '顶部-中' },
          { value: 'top-right', label: '顶部-右' },
          { value: 'left-top', label: '左边-上' },
          { value: 'left-middle', label: '左边-中' },
          { value: 'left-bottom', label: '左边-下' },
          { value: 'right-top', label: '右边-上' },
          { value: 'right-middle', label: '右边-中' },
          { value: 'right-bottom', label: '右边-下' },
          { value: 'bottom-left', label: '底部-左' },
          { value: 'bottom-center', label: '底部-中' },
          { value: 'bottom-right', label: '底部-右' }
        ],
        category: 'layout'
      },
      'info-offset-x': {
        type: 'slider',
        label: '水平偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-offset-y': {
        type: 'slider',
        label: '垂直偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-rotate': {
        type: 'slider',
        label: '旋转角度',
        defaultValue: 0,
        min: -45,
        max: 45,
        step: 1,
        unit: 'deg',
        category: 'layout'
      },
      // 样式控制  
      'visibility': { type: 'select', label: '显示状态', defaultValue: 'visible', options: [{ value: 'visible', label: '显示' }, { value: 'hidden', label: '隐藏' }], category: 'basic' },
      'color': { type: 'color', label: '文字颜色', defaultValue: '#888888', category: 'text' },
      'font-size': { type: 'slider', label: '字体大小', defaultValue: 11, min: 8, max: 20, step: 1, unit: 'px', category: 'text' },
      'font-weight': { type: 'select', label: '字体粗细', defaultValue: 'normal', options: [{ value: 'normal', label: '正常' }, { value: 'bold', label: '粗体' }], category: 'text' },
      'text-shadow': { type: 'text', label: '文字阴影', defaultValue: 'none', placeholder: 'x y blur color', category: 'text' },
      'background-color': { type: 'color', label: '背景颜色', defaultValue: 'transparent', category: 'background' },
      'border-radius': { type: 'slider', label: '圆角', defaultValue: 0, min: 0, max: 10, step: 1, unit: 'px', category: 'border' },
      'box-shadow': { type: 'text', label: '容器阴影', defaultValue: 'none', placeholder: 'x y blur color', category: 'effects' },
      'padding': { type: 'slider', label: '内边距', defaultValue: 2, min: 0, max: 10, step: 1, unit: 'px', category: 'spacing' }
    }
  },

  // AIToken计数器显示
  {
    selector: '.mes[is_user="false"] .tokenCounterDisplay',
    displayName: '聊天区域 - AIToken计数',
    category: 'message',
    editableProperties: {
      // 🔥 完整布局控制 (复用头像布局逻辑)
      'info-layout-mode': {
        type: 'select',
        label: '布局模式',
        defaultValue: 'none',
        options: [
          { value: 'none', label: '无（保持原位置）' },
          { value: 'squeeze', label: '挤压文字模式（影响布局）' },
          { value: 'overlay', label: '悬浮模式（覆盖在上层）' }
        ],
        category: 'layout'
      },
      'info-position': {
        type: 'select',
        label: '位置',
        defaultValue: 'bottom-left',
        options: [
          { value: 'top-left', label: '顶部-左' },
          { value: 'top-center', label: '顶部-中' },
          { value: 'top-right', label: '顶部-右' },
          { value: 'left-top', label: '左边-上' },
          { value: 'left-middle', label: '左边-中' },
          { value: 'left-bottom', label: '左边-下' },
          { value: 'right-top', label: '右边-上' },
          { value: 'right-middle', label: '右边-中' },
          { value: 'right-bottom', label: '右边-下' },
          { value: 'bottom-left', label: '底部-左' },
          { value: 'bottom-center', label: '底部-中' },
          { value: 'bottom-right', label: '底部-右' }
        ],
        category: 'layout'
      },
      'info-offset-x': {
        type: 'slider',
        label: '水平偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-offset-y': {
        type: 'slider',
        label: '垂直偏移',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1,
        unit: 'px',
        category: 'layout'
      },
      'info-rotate': {
        type: 'slider',
        label: '旋转角度',
        defaultValue: 0,
        min: -45,
        max: 45,
        step: 1,
        unit: 'deg',
        category: 'layout'
      },
      // 样式控制
      'visibility': { type: 'select', label: '显示状态', defaultValue: 'visible', options: [{ value: 'visible', label: '显示' }, { value: 'hidden', label: '隐藏' }], category: 'basic' },
      'color': { type: 'color', label: '文字颜色', defaultValue: '#999999', category: 'text' },
      'font-size': { type: 'slider', label: '字体大小', defaultValue: 10, min: 8, max: 20, step: 1, unit: 'px', category: 'text' },
      'font-weight': { type: 'select', label: '字体粗细', defaultValue: 'normal', options: [{ value: 'normal', label: '正常' }, { value: 'bold', label: '粗体' }], category: 'text' },
      'text-shadow': { type: 'text', label: '文字阴影', defaultValue: 'none', placeholder: 'x y blur color', category: 'text' },
      'background-color': { type: 'color', label: '背景颜色', defaultValue: 'transparent', category: 'background' },
      'border-radius': { type: 'slider', label: '圆角', defaultValue: 0, min: 0, max: 10, step: 1, unit: 'px', category: 'border' },
      'box-shadow': { type: 'text', label: '容器阴影', defaultValue: 'none', placeholder: 'x y blur color', category: 'effects' },
      'padding': { type: 'slider', label: '内边距', defaultValue: 2, min: 0, max: 10, step: 1, unit: 'px', category: 'spacing' }
    }
  }
];

/**
 * 注册聊天区元素
 */
export function registerChatElements(registry) {
  ChatElements.forEach(element => {
    registry.registerElement(element);
  });
}