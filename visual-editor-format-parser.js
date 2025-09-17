/**
 * 中文格式解析器 - 双向翻译引擎
 * 
 * 核心功能：
 * - 中文属性名↔英文CSS属性双向映射（如：背景颜色↔background-color）
 * - 中文属性值翻译（如：红色↔red，居中↔center）
 * - 生成人类可读的中文格式CSS代码
 * - 解析现有CSS为中文格式，便于可视化编辑
 */

/**
 * 智能缓存类 - 简单粗暴版
 * 功能：缓存CSS解析结果，提升性能
 */
class SmartCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 10;  // 最多存10个，防止爆内存
  }

  // 🎯 核心方法：解析CSS（带缓存）
  parseCSS(cssText, actualParseFunc) {
    // 🔑 用CSS内容的前100字符作为key
    const key = cssText.slice(0, 100) + '_' + cssText.length;

    // 🔍 有缓存直接返回
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // 🔧 没缓存就解析
    const result = actualParseFunc(cssText);

    // 💾 存入缓存
    this.cache.set(key, result);

    // 🧹 防止缓存太多
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    return result;
  }

  // 🧹 主题切换时清空（防止冲突）
  clear() {
    this.cache.clear();
  }
}

export class VisualEditorFormatParser {
  constructor(module) {
    this.module = module;

    // 🚀 初始化智能缓存
    this.smartCache = new SmartCache();

    // 元素名称映射（中文 -> CSS选择器）
    this.elementMap = {
      // 消息相关
      '用户消息': '.mes[is_user="true"] .mes_block',
      '角色消息': '.mes:not([is_user="true"]) .mes_block',
      'AI消息': '.mes[is_user="false"] .mes_block',
      '消息文本': '.mes_text',
      '角色名称': '.ch_name',
      '用户头像': '.mes[is_user="true"] .avatar img',
      '角色头像': '.mes:not([is_user="true"]) .avatar img',
      '头像': '.avatar img',
      '时间戳': '.timestamp',

      // 输入相关
      '输入框': '#send_textarea',
      '发送按钮': '#send_but',
      '输入区域': '#send_form',
      '停止按钮': '#stop_generate',

      // 界面布局
      '聊天区域': '#chat',
      '顶部栏': '#top-bar',
      '侧边栏': '.drawer-content',
      '页面背景': 'body',

      // 控件
      '通用按钮': '.menu_button',
      '滑动按钮': '.swipe_left, .swipe_right',
      '弹窗': '.popup',
      '滚动条': '::-webkit-scrollbar',
      '滚动条滑块': '::-webkit-scrollbar-thumb',

      // 角色相关
      '角色卡片': '.character_select',
      '角色标签': '.character_tag',

      // 世界书
      '世界书条目': '.world_entry',
      '条目标题': '.world_entry_title',
      '条目内容': '.world_entry_content',

      // 头像元素
      '用户头像': '.mes[is_user="true"] .avatar',
      'AI角色头像': '.mes[is_user="false"] .avatar',
      '角色头像': '.mes[is_user="false"] .avatar',

      // 信息显示相关
      // 🔥 单个信息显示元素映射 (删除虚拟组和用户计时器)
      '用户消息ID': '.mes[is_user="true"] .mesIDDisplay',
      '用户Token计数': '.mes[is_user="true"] .tokenCounterDisplay',
      'AI消息ID': '.mes[is_user="false"] .mesIDDisplay',
      'AI计时器': '.mes[is_user="false"] .mes_timer',
      'AIToken计数': '.mes[is_user="false"] .tokenCounterDisplay',

      // 图标元素
      'AI响应配置': '#leftNavDrawerIcon',
      '角色管理图标': '#rightNavDrawerIcon',
      '扩展菜单图标': '#extensionsMenuIcon',
      '设置图标': '#settingsIcon'
    };

    // 反向映射（CSS选择器 -> 中文）
    this.reverseElementMap = {};
    for (const [cn, selector] of Object.entries(this.elementMap)) {
      this.reverseElementMap[selector] = cn;
    }

    // 属性映射（中文 -> CSS属性） - 完整版
    this.propertyMap = {
      // 基础属性
      '背景颜色': 'background-color',
      '背景': 'background',
      '背景图片': 'background-image',
      '背景大小': 'background-size',
      '背景位置': 'background-position',
      '背景重复': 'background-repeat',
      '背景附着': 'background-attachment',
      '文字颜色': 'color',
      '透明度': 'opacity',

      // 图标特殊属性
      '图标颜色': 'icon-color',
      '图标大小': 'icon-size',

      // 头像布局专用属性
      '布局模式': 'avatar-layout-mode',
      '头像位置': 'avatar-position',
      '水平偏移': 'avatar-offset-x',
      '垂直偏移': 'avatar-offset-y',
      '旋转角度': 'avatar-rotate',

      // 信息显示布局专用属性
      '信息布局模式': 'info-layout-mode',
      '信息位置': 'info-position',
      '信息水平偏移': 'info-offset-x',
      '信息垂直偏移': 'info-offset-y',
      '信息旋转角度': 'info-rotate',
      '排列方向': 'info-direction',

      // 边框相关
      '边框': 'border',
      '圆角': 'border-radius',
      '边框颜色': 'border-color',
      '边框宽度': 'border-width',
      '边框样式': 'border-style',

      // 间距
      '内边距': 'padding',
      '外边距': 'margin',
      '上边距': 'margin-top',
      '下边距': 'margin-bottom',
      '左边距': 'margin-left',
      '右边距': 'margin-right',
      '上内边距': 'padding-top',
      '下内边距': 'padding-bottom',
      '左内边距': 'padding-left',
      '右内边距': 'padding-right',

      // 文字样式
      '字体大小': 'font-size',
      '字体': 'font-family',
      '字体粗细': 'font-weight',
      '行高': 'line-height',
      '字间距': 'letter-spacing',
      '文字对齐': 'text-align',
      '文字装饰': 'text-decoration',
      '文字变换': 'text-transform',

      // 尺寸
      '宽度': 'width',
      '高度': 'height',
      '最大宽度': 'max-width',
      '最小宽度': 'min-width',
      '最大高度': 'max-height',
      '最小高度': 'min-height',

      // 阴影效果（统一映射）
      '阴影': 'box-shadow',
      '文字阴影': 'text-shadow',
      '启用阴影': 'shadow-enabled',
      '阴影水平偏移': 'shadow-x',
      '阴影垂直偏移': 'shadow-y',
      '阴影模糊': 'shadow-blur',
      '阴影扩散': 'shadow-spread',
      '阴影颜色': 'shadow-color',
      '阴影透明度': 'shadow-opacity',

      // 滤镜效果
      '滤镜': 'filter',
      '模糊': 'blur',
      '亮度': 'brightness',
      '对比度': 'contrast',
      '灰度': 'grayscale',
      '色相旋转': 'hue-rotate',
      '饱和度': 'saturate',
      '反转': 'invert',
      '褐色': 'sepia',

      // 动画和过渡
      '过渡效果': 'transition',
      '过渡': 'transition',
      '动画': 'animation',
      '变换': 'transform',

      // 布局
      '显示方式': 'display',
      '定位': 'position',
      '层级': 'z-index',
      '浮动': 'float',
      '溢出': 'overflow',
      '溢出水平': 'overflow-x',
      '溢出垂直': 'overflow-y',

      // 定位相关
      '位置': 'position',
      '顶部': 'top',
      '底部': 'bottom',
      '左边': 'left',
      '右边': 'right',
      '左': 'left',
      '右': 'right',
      '上': 'top',
      '下': 'bottom',

      // Flexbox弹性布局（完整支持）
      '弹性方向': 'flex-direction',
      '弹性换行': 'flex-wrap',
      '弹性流': 'flex-flow',
      '主轴对齐': 'justify-content',
      '交叉轴对齐': 'align-items',
      '内容对齐': 'align-content',
      '弹性增长': 'flex-grow',
      '弹性收缩': 'flex-shrink',
      '弹性基础': 'flex-basis',
      '弹性': 'flex',
      '自身对齐': 'align-self',
      '顺序': 'order',
      '间距': 'gap',
      '行间距': 'row-gap',
      '列间距': 'column-gap',

      // Grid网格布局（完整支持）
      '网格模板列': 'grid-template-columns',
      '网格模板行': 'grid-template-rows',
      '网格模板区域': 'grid-template-areas',
      '网格模板': 'grid-template',
      '网格列间距': 'column-gap',
      '网格行间距': 'row-gap',
      '网格间距': 'gap',
      '网格列开始': 'grid-column-start',
      '网格列结束': 'grid-column-end',
      '网格列': 'grid-column',
      '网格行开始': 'grid-row-start',
      '网格行结束': 'grid-row-end',
      '网格行': 'grid-row',
      '网格区域': 'grid-area',
      '网格自动列': 'grid-auto-columns',
      '网格自动行': 'grid-auto-rows',
      '网格自动流': 'grid-auto-flow',

      // Transform变换（完整支持）
      '变换原点': 'transform-origin',
      '变换风格': 'transform-style',
      '透视': 'perspective',
      '透视原点': 'perspective-origin',
      '背面可见': 'backface-visibility',

      // Animation动画（完整支持）
      '动画名称': 'animation-name',
      '动画持续时间': 'animation-duration',
      '动画时间函数': 'animation-timing-function',
      '动画延迟': 'animation-delay',
      '动画次数': 'animation-iteration-count',
      '动画方向': 'animation-direction',
      '动画填充模式': 'animation-fill-mode',
      '动画播放状态': 'animation-play-state',

      // 过渡效果（完整支持）
      '过渡属性': 'transition-property',
      '过渡持续时间': 'transition-duration',
      '过渡时间函数': 'transition-timing-function',
      '过渡延迟': 'transition-delay',

      // 滤镜效果（完整支持 - 改色改亮度等）
      '亮度': 'brightness',
      '对比度': 'contrast',
      '灰度': 'grayscale',
      '色相旋转': 'hue-rotate',
      '色相': 'hue-rotate',
      '饱和度': 'saturate',
      '反转': 'invert',
      '褐色': 'sepia',
      '模糊度': 'blur',
      '投影': 'drop-shadow',

      // 混合模式
      '混合模式': 'mix-blend-mode',
      '背景混合模式': 'background-blend-mode',

      // 裁剪和蒙版
      '裁剪路径': 'clip-path',
      '裁剪': 'clip',
      '蒙版': 'mask',
      '蒙版图片': 'mask-image',
      '蒙版大小': 'mask-size',
      '蒙版位置': 'mask-position',
      '蒙版重复': 'mask-repeat',

      // 滚动相关
      '滚动行为': 'scroll-behavior',
      '滚动捕捉类型': 'scroll-snap-type',
      '滚动捕捉对齐': 'scroll-snap-align',
      '滚动边距': 'scroll-margin',
      '滚动内边距': 'scroll-padding',

      // 形状相关
      '形状外部': 'shape-outside',
      '形状边距': 'shape-margin',
      '形状图片阈值': 'shape-image-threshold',

      // 交互相关
      '指针事件': 'pointer-events',
      '触摸动作': 'touch-action',
      '用户拖拽': 'user-drag',
      '用户修改': 'user-modify',

      // 文本相关扩展
      '文本溢出': 'text-overflow',
      '单词换行': 'word-wrap',
      '单词断行': 'word-break',
      '连字符': 'hyphens',
      '文本方向': 'writing-mode',
      '文本阴影模糊': 'text-shadow-blur',

      // 表格相关
      '表格布局': 'table-layout',
      '边框合并': 'border-collapse',
      '边框间距': 'border-spacing',
      '空单元格': 'empty-cells',
      '标题位置': 'caption-side',

      // 列表相关
      '列表样式': 'list-style',
      '列表样式类型': 'list-style-type',
      '列表样式位置': 'list-style-position',
      '列表样式图片': 'list-style-image',

      // 装饰元素控制
      '是否超出父元素显示': 'decoration-overflow-mode',

      // 其他现代CSS
      '鼠标样式': 'cursor',
      '用户选择': 'user-select',
      '内容': 'content',
      '模糊效果': 'backdrop-filter',
      '计数器重置': 'counter-reset',
      '计数器增量': 'counter-increment',
      '引用': 'quotes',
      '孤行控制': 'orphans',
      '寡行控制': 'widows',
      '分页前': 'page-break-before',
      '分页后': 'page-break-after',
      '分页内': 'page-break-inside'
    };

    // 反向映射
    this.reversePropertyMap = {};
    for (const [cn, prop] of Object.entries(this.propertyMap)) {
      // 只保留第一个映射（确保一对一）
      if (!this.reversePropertyMap[prop]) {
        this.reversePropertyMap[prop] = cn;
      }
    }

    // 预设值映射 - 仅保留必要的CSS关键字和复杂语法
    this.presetValues = {
      // 新手必需词汇
      '透明': 'transparent',
      '无': 'none',

      // CSS关键字值（新手不知道的专业术语）
      '包含': 'contain',
      '覆盖': 'cover',
      '自动': 'auto',

      // 定位值
      '相对定位': 'relative',
      '绝对定位': 'absolute',
      '固定定位': 'fixed',
      '粘性定位': 'sticky',
      '静态定位': 'static',

      // 显示值
      '块级': 'block',
      '行内': 'inline',
      '行内块': 'inline-block',
      '弹性盒': 'flex',
      '网格': 'grid',
      '表格': 'table',
      '表格行': 'table-row',
      '表格单元格': 'table-cell',

      // 功能开关
      '启用': 'enabled',
      '禁用': 'disabled',

      // 复杂特效预设（语法复杂，保留）
      '毛玻璃': 'blur(8px)',
      '快速过渡': 'all 0.2s ease',
      '标准过渡': 'all 0.3s ease',
      '慢速过渡': 'all 0.5s ease'
    };

    // 函数值处理 - 完整CSS函数支持
    this.functionPatterns = {
      // 变换函数
      '缩放': /^缩放\((.*?)\)$/,
      '旋转': /^旋转\((.*?)\)$/,
      '移动': /^移动\((.*?)\)$/,
      '倾斜': /^倾斜\((.*?)\)$/,
      '矩阵': /^矩阵\((.*?)\)$/,

      // 滤镜函数（改色改亮度等）
      '模糊': /^模糊\((.*?)\)$/,
      '投影': /^投影\((.*?)\)$/,
      '亮度': /^亮度\((.*?)\)$/,
      '对比度': /^对比度\((.*?)\)$/,
      '饱和度': /^饱和度\((.*?)\)$/,
      '色相': /^色相\((.*?)\)$/,
      '色相旋转': /^色相旋转\((.*?)\)$/,
      '灰度': /^灰度\((.*?)\)$/,
      '反转': /^反转\((.*?)\)$/,
      '褐色': /^褐色\((.*?)\)$/,

      // 背景函数
      '渐变': /^渐变\((.*?)\)$/,
      '线性渐变': /^线性渐变\((.*?)\)$/,
      '径向渐变': /^径向渐变\((.*?)\)$/,
      '圆锥渐变': /^圆锥渐变\((.*?)\)$/,

      // 其他函数
      '计算': /^计算\((.*?)\)$/,
      '最小值': /^最小值\((.*?)\)$/,
      '最大值': /^最大值\((.*?)\)$/,
      '夹值': /^夹值\((.*?)\)$/,
      '变量': /^变量\((.*?)\)$/
    };
  }

  /**
   * 解析中文格式为样式Map（缓存优化版）
   * @param {string} input - 中文格式输入
   * @returns {Map} - 样式Map
   */
  parseChineseFormat(input) {
    // 🚀 使用智能缓存，避免重复解析
    return this.smartCache.parseCSS(input, (cssText) => {
      return this._actualParseChineseFormat(cssText);
    });
  }

  /**
   * 实际的中文格式解析逻辑（原来的方法）
   * @param {string} input - 中文格式输入
   * @returns {Map} - 样式Map
   */
  _actualParseChineseFormat(input) {
    const styles = new Map();

    // 按行分割
    const lines = input.split('\n');
    let currentElement = null;
    let currentStyles = {};

    for (let line of lines) {
      line = line.trim();

      // 【关键修复】跳过@装饰语法行，让CSSPreprocessor处理
      if (line.startsWith('@')) {
        // 如果在@块内，跳过直到找到 }
        const blockEnd = lines.indexOf('}', lines.indexOf(line));
        if (blockEnd !== -1) {
          // 跳过整个@装饰块
          continue;
        }
      }

      // 跳过空行、注释和任何包含标记的行
      if (!line ||
        line.startsWith('#') ||
        line.startsWith('//') ||
        line.startsWith('/*') ||
        line.includes('✨') ||
        line.includes('视觉样式配置') ||
        line.includes('undefined')) {
        continue;
      }

      // 检查是否是元素声明（以 { 结尾）
      if (line.endsWith('{')) {
        // 保存上一个元素的样式
        if (currentElement && Object.keys(currentStyles).length > 0) {
          styles.set(currentElement, { ...currentStyles });
        }

        // 开始新元素
        const elementName = line.replace('{', '').trim();
        currentElement = this.getSelector(elementName);
        currentStyles = {};

      } else if (line === '}') {
        // 元素结束，保存样式
        if (currentElement && Object.keys(currentStyles).length > 0) {
          styles.set(currentElement, { ...currentStyles });
        }
        currentElement = null;
        currentStyles = {};

      } else if (line.includes(':') && currentElement) {
        // 解析属性行
        const colonIndex = line.indexOf(':');
        const propName = line.substring(0, colonIndex).trim();
        const propValue = line.substring(colonIndex + 1).trim();

        // 【增强检查】确保属性名和值都存在
        if (!propName || !propValue) {
          console.warn('[FormatParser] 跳过无效属性行:', line);
          continue;
        }

        // 获取CSS属性名
        const cssProp = this.getProperty(propName);
        if (cssProp) {
          // 解析属性值 - 现在确保property不为空
          const cssValue = this.parseValue(propValue, cssProp);
          currentStyles[cssProp] = cssValue;
        } else {
          console.warn('[FormatParser] 未知属性:', propName);
        }
      }
    }

    // 保存最后一个元素（如果有）
    if (currentElement && Object.keys(currentStyles).length > 0) {
      styles.set(currentElement, { ...currentStyles });
    }

    return styles;
  }

  /**
   * 将样式Map转换为中文格式
   * @param {Map} styles - 样式Map
   * @param {Object} metadata - 元数据（忽略）
   * @returns {string} - 中文格式字符串
   */
  generateChineseFormat(styles, metadata = {}) {
    // 如果没有样式，返回空字符串
    if (!styles || styles.size === 0) {
      return '';
    }

    let output = '';

    // 按类别组织样式
    const categorized = this.categorizeStyles(styles);

    // 生成各类别的样式
    for (const [category, rules] of Object.entries(categorized)) {
      if (rules.length === 0) continue;

      output += `# ${this.getCategoryTitle(category)}\n`;

      for (const [selector, properties] of rules) {
        // 🔧 修复：特殊图标选择器保持CSS格式，不转换为中文
        let elementName = selector;
        if (selector !== '#leftNavDrawerIcon' && selector !== '#rightNavDrawerIcon') {
          elementName = this.getElementName(selector);
        }
        output += `${elementName} {\n`;

        // 转换属性
        for (const [prop, value] of Object.entries(properties)) {
          const cnProp = this.getPropertyName(prop);
          const cnValue = this.formatValue(value, prop);
          output += `  ${cnProp}: ${cnValue}\n`;
        }

        output += '}\n';
      }

      // 类别之间只添加一个空行
      output += '\n';
    }

    // 去掉末尾的空行
    return output.trim();
  }

  /**
   * 获取CSS选择器
   */
  getSelector(elementName) {
    return this.elementMap[elementName] || elementName;
  }

  /**
   * 获取元素中文名
   */
  getElementName(selector) {
    return this.reverseElementMap[selector] || selector;
  }

  /**
   * 获取CSS属性
   */
  getProperty(propName) {
    return this.propertyMap[propName] || propName;
  }

  /**
   * 获取属性中文名
   */
  getPropertyName(prop) {
    return this.reversePropertyMap[prop] || prop;
  }

  /**
   * 解析属性值
   * 【关键修复】添加参数检查，防止undefined错误
   */
  parseValue(value, property) {
    // 【安全检查】如果property未定义，直接返回原值
    if (!property) {
      console.warn('[FormatParser] parseValue: property参数为空，返回原始值', value);
      return value;
    }

    // 移除可能的引号
    value = value.replace(/^["']|["']$/g, '');

    // 检查预设值
    if (this.presetValues[value]) {
      return this.presetValues[value];
    }

    // 检查函数值
    for (const [fnName, pattern] of Object.entries(this.functionPatterns)) {
      const match = value.match(pattern);
      if (match) {
        return this.parseFunctionValue(fnName, match[1]);
      }
    }

    // 处理带单位的值（统一格式）
    if (/^\d+(?:\.\d+)?(?:像素|百分比|倍|度|字高)$/.test(value)) {
      return this.parseUnitValue(value);
    }

    // 处理RGB颜色（保持格式）
    if (value.startsWith('rgb(') || value.startsWith('rgba(')) {
      return value;
    }

    // 处理十六进制颜色 - 转换为RGB
    if (value.match(/^#[0-9a-fA-F]{3,6}$/)) {
      return this.hexToRgb(value);
    }

    // 特殊属性值处理 - 现在安全了
    if (property.endsWith && property.endsWith('-enabled')) {
      return value === '启用' ? 'enabled' : 'disabled';
    }

    // 头像布局属性值处理
    if (property === 'avatar-layout-mode') {
      const layoutModeMap = {
        '无': 'none',
        '无布局': 'none',
        '挤压文字模式': 'squeeze',
        '挤压模式': 'squeeze',
        '悬浮模式': 'overlay',
        '覆盖模式': 'overlay'
      };
      return layoutModeMap[value] || value;
    }

    // 信息布局属性值处理
    if (property === 'info-layout-mode') {
      const infoLayoutModeMap = {
        '无': 'none',
        '保持原位置': 'none',
        '挤压文字模式': 'squeeze',  // 🔥 统一使用"挤压文字模式"
        '挤压模式': 'squeeze',      // 兼容旧版本
        '影响布局': 'squeeze',
        '悬浮模式': 'overlay',
        '覆盖在上层': 'overlay',
        '覆盖模式': 'overlay'
      };
      return infoLayoutModeMap[value] || value;
    }

    if (property === 'info-direction') {
      const directionMap = {
        '竖列': 'column',
        '上下排列': 'column',
        '垂直排列': 'column',
        '横列': 'row',
        '左右排列': 'row',
        '水平排列': 'row'
      };
      return directionMap[value] || value;
    }

    if (property === 'info-position') {
      // 复用头像位置映射
      const positionMap = {
        '顶部左': 'top-left',
        '顶部中': 'top-center',
        '顶部右': 'top-right',
        '左边上': 'left-top',
        '左边中': 'left-middle',
        '左边下': 'left-bottom',
        '右边上': 'right-top',
        '右边中': 'right-middle',
        '右边下': 'right-bottom',
        '底部左': 'bottom-left',
        '底部中': 'bottom-center',
        '底部右': 'bottom-right',
        // 简化写法支持
        '顶左': 'top-left',
        '顶中': 'top-center',
        '顶右': 'top-right',
        '左上': 'left-top',
        '左中': 'left-middle',
        '左下': 'left-bottom',
        '右上': 'right-top',
        '右中': 'right-middle',
        '右下': 'right-bottom',
        '底左': 'bottom-left',
        '底中': 'bottom-center',
        '底右': 'bottom-right'
      };
      return positionMap[value] || value;
    }

    if (property === 'avatar-position') {
      const positionMap = {
        '顶部左': 'top-left',
        '顶部中': 'top-center',
        '顶部右': 'top-right',
        '左边上': 'left-top',
        '左边中': 'left-middle',
        '左边下': 'left-bottom',
        '右边上': 'right-top',
        '右边中': 'right-middle',
        '右边下': 'right-bottom',
        '底部左': 'bottom-left',
        '底部中': 'bottom-center',
        '底部右': 'bottom-right',
        // 简化写法支持
        '顶左': 'top-left',
        '顶中': 'top-center',
        '顶右': 'top-right',
        '左上': 'left-top',
        '左中': 'left-middle',
        '左下': 'left-bottom',
        '右上': 'right-top',
        '右中': 'right-middle',
        '右下': 'right-bottom',
        '底左': 'bottom-left',
        '底中': 'bottom-center',
        '底右': 'bottom-right'
      };
      return positionMap[value] || value;
    }

    // 直接返回
    return value;
  }

  /**
   * 十六进制转RGB
   */
  hexToRgb(hex) {
    // 去掉#号
    hex = hex.replace('#', '');

    // 处理3位简写
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgb(${r},${g},${b})`;
  }

  /**
   * 解析带单位的值 - 完整单位支持
   */
  parseUnitValue(value) {
    const unitMap = {
      // 长度单位
      '像素': 'px',
      '字高': 'em',
      '根字高': 'rem',
      '字符宽': 'ch',
      '字符高': 'ex',
      '英寸': 'in',
      '厘米': 'cm',
      '毫米': 'mm',
      '点': 'pt',
      '派卡': 'pc',

      // 视口单位
      '视口宽': 'vw',
      '视口高': 'vh',
      '视口最小': 'vmin',
      '视口最大': 'vmax',

      // 百分比和倍数
      '百分比': '%',
      '倍': '',
      '分数': 'fr',

      // 角度单位
      '度': 'deg',
      '弧度': 'rad',
      '梯度': 'grad',
      '圈': 'turn',

      // 时间单位
      '秒': 's',
      '毫秒': 'ms',

      // 频率单位
      '赫兹': 'Hz',
      '千赫兹': 'kHz',

      // 分辨率单位
      '每英寸点数': 'dpi',
      '每厘米点数': 'dpcm',
      '每像素点数': 'dppx'
    };

    for (const [cnUnit, cssUnit] of Object.entries(unitMap)) {
      if (value.endsWith(cnUnit)) {
        const num = value.replace(cnUnit, '');
        return num + cssUnit;
      }
    }

    return value;
  }

  /**
   * 解析函数值 - 完整CSS函数支持
   */
  parseFunctionValue(fnName, params) {
    switch (fnName) {
      // 变换函数
      case '缩放':
        return `scale(${params})`;
      case '旋转':
        return `rotate(${this.parseUnitValue(params)})`;
      case '移动':
        return `translate(${params})`;
      case '倾斜':
        return `skew(${params})`;
      case '矩阵':
        return `matrix(${params})`;

      // 滤镜函数（改色改亮度等）
      case '模糊':
        return `blur(${this.parseUnitValue(params)})`;
      case '投影':
        return `drop-shadow(${params})`;
      case '亮度':
        return `brightness(${params})`;
      case '对比度':
        return `contrast(${params})`;
      case '饱和度':
        return `saturate(${params})`;
      case '色相':
      case '色相旋转':
        return `hue-rotate(${this.parseUnitValue(params)})`;
      case '灰度':
        return `grayscale(${params})`;
      case '反转':
        return `invert(${params})`;
      case '褐色':
        return `sepia(${params})`;

      // 背景函数
      case '渐变':
      case '线性渐变':
        return this.parseGradient(params);
      case '径向渐变':
        return this.parseRadialGradient(params);
      case '圆锥渐变':
        return this.parseConicGradient(params);

      // 其他函数
      case '计算':
        return `calc(${params})`;
      case '最小值':
        return `min(${params})`;
      case '最大值':
        return `max(${params})`;
      case '夹值':
        return `clamp(${params})`;
      case '变量':
        return `var(${params})`;

      default:
        return params;
    }
  }

  /**
   * 解析渐变
   */
  parseGradient(params) {
    // 简单处理：线性渐变
    const parts = params.split(' 到 ');
    if (parts.length === 2) {
      const from = this.parseValue(parts[0], 'background');
      const to = this.parseValue(parts[1], 'background');
      return `linear-gradient(${from}, ${to})`;
    }
    return params;
  }

  /**
   * 解析径向渐变
   */
  parseRadialGradient(params) {
    const parts = params.split(' 到 ');
    if (parts.length === 2) {
      const from = this.parseValue(parts[0], 'background');
      const to = this.parseValue(parts[1], 'background');
      return `radial-gradient(${from}, ${to})`;
    }
    return `radial-gradient(${params})`;
  }

  /**
   * 解析圆锥渐变
   */
  parseConicGradient(params) {
    const parts = params.split(' 到 ');
    if (parts.length === 2) {
      const from = this.parseValue(parts[0], 'background');
      const to = this.parseValue(parts[1], 'background');
      return `conic-gradient(${from}, ${to})`;
    }
    return `conic-gradient(${params})`;
  }

  /**
   * 格式化值为中文
   */
  formatValue(value, property) {
    // 【安全检查】
    if (!property) {
      return value;
    }

    // 处理特殊值
    if (value === 'transparent') {
      return '透明';
    }

    if (value === 'none') {
      return '无';
    }

    // 处理阴影启用状态
    if (property === 'shadow-enabled' ||
      property === 'button-shadow-enabled' ||
      property === 'icon-shadow-enabled') {
      return value === 'enabled' ? '启用' : '禁用';
    }

    // 头像布局属性反向映射
    if (property === 'avatar-layout-mode') {
      const reverseModeMap = {
        'none': '无',
        'squeeze': '挤压文字模式',
        'overlay': '悬浮模式'
      };
      return reverseModeMap[value] || value;
    }

    // 信息布局属性反向映射
    if (property === 'info-layout-mode') {
      const reverseInfoModeMap = {
        'none': '无',
        'squeeze': '挤压文字模式',  // 🔥 统一使用"挤压文字模式"
        'overlay': '悬浮模式'
      };
      return reverseInfoModeMap[value] || value;
    }

    if (property === 'info-direction') {
      const reverseDirectionMap = {
        'column': '竖列',
        'row': '横列'
      };
      return reverseDirectionMap[value] || value;
    }

    if (property === 'info-position') {
      const reversePositionMap = {
        'top-left': '顶部左',
        'top-center': '顶部中',
        'top-right': '顶部右',
        'left-top': '左边上',
        'left-middle': '左边中',
        'left-bottom': '左边下',
        'right-top': '右边上',
        'right-middle': '右边中',
        'right-bottom': '右边下',
        'bottom-left': '底部左',
        'bottom-center': '底部中',
        'bottom-right': '底部右'
      };
      return reversePositionMap[value] || value;
    }

    if (property === 'avatar-position') {
      const reversePositionMap = {
        'top-left': '顶部左',
        'top-center': '顶部中',
        'top-right': '顶部右',
        'left-top': '左边上',
        'left-middle': '左边中',
        'left-bottom': '左边下',
        'right-top': '右边上',
        'right-middle': '右边中',
        'right-bottom': '右边下',
        'bottom-left': '底部左',
        'bottom-center': '底部中',
        'bottom-right': '底部右'
      };
      return reversePositionMap[value] || value;
    }

    // 处理颜色值 - 统一为数值+单位格式
    if (value.startsWith('rgb(') || value.startsWith('rgba(')) {
      // 保持RGB格式原样
      return value;
    }

    // 处理十六进制颜色
    if (value.match(/^#[0-9a-fA-F]{3,6}$/)) {
      // 转换为RGB并返回
      return this.hexToRgb(value);
    }

    // 处理带单位的数值 - 统一为数值+中文单位
    const unitMatch = value.match(/^(\d+(?:\.\d+)?)(px|%|deg|rad|grad|turn|ms|s|em|rem|ch|ex|in|cm|mm|pt|pc|vh|vw|vmin|vmax|fr|Hz|kHz|dpi|dpcm|dppx)$/);
    if (unitMatch) {
      const [, num, unit] = unitMatch;
      const cnUnit = {
        // 长度单位
        'px': '像素',
        'em': '字高',
        'rem': '根字高',
        'ch': '字符宽',
        'ex': '字符高',
        'in': '英寸',
        'cm': '厘米',
        'mm': '毫米',
        'pt': '点',
        'pc': '派卡',

        // 视口单位
        'vw': '视口宽',
        'vh': '视口高',
        'vmin': '视口最小',
        'vmax': '视口最大',

        // 百分比和倍数
        '%': '百分比',
        'fr': '分数',

        // 角度单位
        'deg': '度',
        'rad': '弧度',
        'grad': '梯度',
        'turn': '圈',

        // 时间单位
        's': '秒',
        'ms': '毫秒',

        // 频率单位
        'Hz': '赫兹',
        'kHz': '千赫兹',

        // 分辨率单位
        'dpi': '每英寸点数',
        'dpcm': '每厘米点数',
        'dppx': '每像素点数'
      }[unit] || unit;

      return `${num}${cnUnit}`;
    }

    // 处理渐变
    if (value.includes('gradient')) {
      return this.formatGradient(value);
    }

    // 处理滤镜值
    if (value.includes('drop-shadow')) {
      return value.replace('drop-shadow', '投影');
    }

    // 处理背景大小值
    const bgSizeMap = {
      'contain': '包含',
      'cover': '覆盖',
      'auto': '自动'
    };
    if (bgSizeMap[value]) {
      return bgSizeMap[value];
    }

    // 处理定位值
    const positionMap = {
      'relative': '相对定位',
      'absolute': '绝对定位',
      'fixed': '固定定位',
      'sticky': '粘性定位',
      'static': '静态定位'
    };
    if (positionMap[value]) {
      return positionMap[value];
    }

    // 处理显示值
    const displayMap = {
      'block': '块级',
      'inline': '行内',
      'inline-block': '行内块',
      'flex': '弹性盒',
      'grid': '网格',
      'none': '无'
    };
    if (displayMap[value]) {
      return displayMap[value];
    }

    // 直接返回其他值
    return value;
  }

  /**
   * 格式化渐变为中文
   */
  formatGradient(value) {
    const match = value.match(/linear-gradient\((.*?)\)/);
    if (match) {
      const params = match[1].split(',').map(p => p.trim());
      if (params.length >= 2) {
        return `渐变(${params[0]} 到 ${params[params.length - 1]})`;
      }
    }
    return value;
  }

  /**
   * 分类样式规则
   */
  categorizeStyles(styles) {
    const categories = {
      message: [],
      input: [],
      layout: [],
      controls: [],
      icons: [],
      other: []
    };

    for (const [selector, properties] of styles) {
      const category = this.detectCategory(selector);
      categories[category].push([selector, properties]);
    }

    return categories;
  }

  /**
   * 检测选择器类别
   */
  detectCategory(selector) {
    if (selector.includes('.mes') || selector.includes('.avatar') ||
      selector.includes('.ch_name') || selector.includes('.timestamp')) {
      return 'message';
    }

    if (selector.includes('#send') || selector.includes('textarea') ||
      selector.includes('#stop')) {
      return 'input';
    }

    if (selector.includes('#chat') || selector.includes('#top-bar') ||
      selector.includes('.drawer') || selector === 'body') {
      return 'layout';
    }

    if (selector.includes('button') || selector.includes('.swipe') ||
      selector.includes('scrollbar')) {
      return 'controls';
    }

    if (selector.includes('NavDrawerIcon') || selector.includes('Icon')) {
      return 'icons';
    }

    return 'other';
  }

  /**
   * 获取类别标题
   */
  getCategoryTitle(category) {
    const titles = {
      message: '消息样式',
      input: '输入样式',
      layout: '布局样式',
      controls: '控件样式',
      icons: '图标样式',
      other: '其他样式'
    };
    return titles[category] || '未分类';
  }

  /**
   * 验证中文格式
   */
  validateFormat(input) {
    const errors = [];
    const warnings = [];

    // 检查基本格式
    if (!input.includes('{') || !input.includes('}')) {
      errors.push('缺少样式块标记 { }');
    }

    // 检查属性格式
    const lines = input.split('\n');
    let inBlock = false;
    let inDecorationBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳过@装饰语法块
      if (line.startsWith('@')) {
        inDecorationBlock = true;
        continue;
      }

      if (inDecorationBlock && line === '}') {
        inDecorationBlock = false;
        continue;
      }

      if (inDecorationBlock) {
        continue;
      }

      if (line.endsWith('{')) {
        inBlock = true;
        const elementName = line.replace('{', '').trim();
        if (!this.elementMap[elementName] && !elementName.startsWith('.') && !elementName.startsWith('#')) {
          warnings.push(`第 ${i + 1} 行：未知的元素名称 "${elementName}"`);
        }
      } else if (line === '}') {
        inBlock = false;
      } else if (inBlock && line && !line.startsWith('#') && !line.startsWith('/*')) {
        if (!line.includes(':')) {
          errors.push(`第 ${i + 1} 行：属性行缺少冒号`);
        } else {
          // 检查属性名是否已知
          const colonIndex = line.indexOf(':');
          const propName = line.substring(0, colonIndex).trim();
          if (!this.propertyMap[propName] && !propName.match(/^[a-z-]+$/)) {
            warnings.push(`第 ${i + 1} 行：未知的属性名 "${propName}"`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 导入功能（替代原加密导入）
   */
  importTheme(content) {
    try {
      // 尝试解析中文格式
      const styles = this.parseChineseFormat(content);

      if (styles.size === 0) {
        // 如果中文格式解析失败，尝试普通CSS
        const cssStyles = this.module.parser.parseCSSText(content);
        return {
          success: true,
          styles: cssStyles,
          metadata: { name: '导入的样式', format: 'css' }
        };
      }

      return {
        success: true,
        styles: styles,
        metadata: { name: '导入的中文样式', format: 'chinese' }
      };

    } catch (error) {
      console.error('[FormatParser] 导入失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 导出功能（替代原加密导出）- 无头部版本
   */
  exportTheme(styles, metadata = {}) {
    // 生成中文格式 - 不包含任何头部
    const chineseFormat = this.generateChineseFormat(styles);

    // 简化的文件名
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `视觉主题-${metadata.name || '自定义'}-${timestamp}.css`;

    return {
      css: chineseFormat,
      data: { styles: Array.from(styles.entries()), metadata },
      filename
    };
  }

  /**
   * 获取所有支持的属性列表
   */
  getSupportedProperties() {
    return Object.keys(this.propertyMap);
  }

  /**
   * 获取所有支持的元素列表
   */
  getSupportedElements() {
    return Object.keys(this.elementMap);
  }
}