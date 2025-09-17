/**
 * 可视化CSS编辑器 - 主控制器
 * 
 * 核心功能：
 * - 在自定义CSS下方提供可视化编辑面板
 * - 管理中文格式CSS编辑和应用
 * - 协调子模块：UI渲染、格式解析、CSS预处理
 * - 提供撤销/重做、主题导入导出功能
 */

import { VisualEditorUI } from './visual-editor-ui.js';
import { VisualEditorParser } from './visual-editor-parser.js';
import { VisualEditorGenerator } from './visual-editor-generator.js';
import { VisualEditorRegistry } from './visual-editor-registry.js';
import { VisualEditorPanelsFactory } from './visual-editor-panels-factory.js';
import { VisualEditorFormatParser } from './visual-editor-format-parser.js';
import { CSSPreprocessor } from './visual-editor-css-preprocessor.js';
import { SmartListenerCoordinator } from './visual-editor-smart-listener.js';
import initializeVisualEditor, { QuickStyleTemplates } from './visual-editor-elements-init.js';

export class VisualEditorMain {
  constructor(extension) {
    this.extension = extension;
    this.storage = extension.storage;
    this.eventBus = extension.eventBus;

    // 模块状态
    this.enabled = false; // 🎛️ 改为默认关闭，手动开启（符合用户体验）
    this.panelInserted = false;
    this.currentTheme = null;


    // 当前编辑状态
    this.selectedElement = null;
    this.editHistory = [];
    this.historyIndex = -1;
    this.maxHistorySize = 50;

    // 样式数据结构 - 确保是独立的Map对象
    this.pendingStyles = new Map();
    this.appliedStyles = new Map();

    // 子模块
    this.ui = null;
    this.parser = null;
    this.generator = null;

    // 新架构模块
    this.registry = null;
    this.panelsFactory = null;
    this.formatParser = null;  // 替代原有的 themeCrypto
    this.elementsHelper = null;
    this.quickTemplates = null;

    // CSS预处理器
    this.cssPreprocessor = null;

    // 智能监听协调器
    this.smartListener = null;

    // CSS输入监听定时器
    this.cssInputTimer = null;

    // 主题切换处理定时器
    this.themeChangeTimer = null;

    // 中文格式标记 - 用于识别中文格式内容的开始和结束
    this.CHINESE_START_PATTERN = /^#\s*\S+样式/;  // 匹配 "# 消息样式" 这样的分类标题
    this.CHINESE_BLOCK_PATTERN = /^[^\s#]+\s*{/;  // 匹配 "时间戳 {" 这样的元素块开始

  }

  /**
   * 初始化模块
   */
  async init() {

    // 初始化子模块
    this.initSubModules();

    // 初始化新架构
    await this.initNewArchitecture();

    // 初始化CSS预处理器
    await this.initCSSPreprocessor();

    // 加载设置
    await this.loadSettings();

    // 绑定事件
    this.bindEvents();

    // 初始化智能监听协调器 - 替换原有的单独监听器
    await this.initSmartListener();

  }

  /**
   * 初始化子模块
   */
  initSubModules() {
    this.parser = new VisualEditorParser(this);
    this.generator = new VisualEditorGenerator(this);
  }

  /**
   * 开启/关闭头像拖拽定位模式（极轻交互，仅编辑期启用）
   * 不持久化任何JS逻辑，结果回写为CSS属性
   */
  enableAvatarDragMode(enable = true) {
    if (!enable) {
      // 清理辅助线与事件
      document.querySelectorAll('.ve-avatar-drag-overlay').forEach(el => el.remove());
      document.removeEventListener('pointerdown', this.__veAvatarPointerDown);
      document.removeEventListener('pointermove', this.__veAvatarPointerMove);
      document.removeEventListener('pointerup', this.__veAvatarPointerUp);
      this.__veAvatarDragging = null;
      return;
    }

    // 仅在聊天区域头像容器上启用
    const selectors = ['.mes[is_user="true"] .avatar', '.mes[is_user="false"] .avatar'];
    const targets = document.querySelectorAll(selectors.join(','));

    targets.forEach(target => {
      // 为父容器添加相对定位，避免绝对定位脱离参照
      const block = target.closest('.mes_block');
      if (block && getComputedStyle(block).position === 'static') {
        block.style.position = 'relative';
      }

      // 覆盖层用于提升可拖拽区域（不改变DOM结构）
      const overlay = document.createElement('div');
      overlay.className = 've-avatar-drag-overlay';
      overlay.style.position = 'absolute';
      overlay.style.inset = '0';
      overlay.style.pointerEvents = 'auto';
      overlay.style.cursor = 'move';
      overlay.style.background = 'transparent';
      overlay.style.zIndex = '9999';
      target.style.position = target.style.position || 'absolute';
      target.appendChild(overlay);
    });

    const parsePx = (v) => (typeof v === 'string' && v.endsWith('px')) ? parseFloat(v) : (parseFloat(v) || 0);

    this.__veAvatarPointerDown = (e) => {
      const overlay = e.target.closest('.ve-avatar-drag-overlay');
      if (!overlay) return;
      const avatar = overlay.parentElement;
      const rect = avatar.getBoundingClientRect();
      this.__veAvatarDragging = {
        avatar,
        startX: e.clientX,
        startY: e.clientY,
        origTop: parsePx(getComputedStyle(avatar).top),
        origLeft: parsePx(getComputedStyle(avatar).left)
      };
      e.preventDefault();
    };

    this.__veAvatarPointerMove = (e) => {
      if (!this.__veAvatarDragging) return;
      const { avatar, startX, startY, origTop, origLeft } = this.__veAvatarDragging;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newTop = Math.round(origTop + dy);
      const newLeft = Math.round(origLeft + dx);

      // 实时更新内部样式存储并应用（user/char各自selector）
      const isUser = !!avatar.closest('.mes[is_user="true"]');
      const selector = isUser ? '.mes[is_user="true"] .avatar' : '.mes[is_user="false"] .avatar';

      // 确保绝对定位
      this.updateStyle(selector, 'position', 'absolute');
      this.updateStyle(selector, 'top', `${newTop}px`);
      this.updateStyle(selector, 'left', `${newLeft}px`);
    };

    this.__veAvatarPointerUp = () => {
      if (!this.__veAvatarDragging) return;
      // 一次性应用到输入框（已在updateStyle内触发），这里清理拖拽状态
      this.__veAvatarDragging = null;
    };

    document.addEventListener('pointerdown', this.__veAvatarPointerDown);
    document.addEventListener('pointermove', this.__veAvatarPointerMove);
    document.addEventListener('pointerup', this.__veAvatarPointerUp);
  }

  /**
   * 初始化新架构
   */
  async initNewArchitecture() {
    // 创建注册中心
    this.registry = new VisualEditorRegistry(this);

    // 创建面板工厂
    this.panelsFactory = new VisualEditorPanelsFactory(this, this.registry);

    // 创建中文格式解析器（替代加密模块）
    this.formatParser = new VisualEditorFormatParser(this);

    // 初始化所有元素
    const initResult = initializeVisualEditor(this.registry);
    this.elementsHelper = initResult.helper;

    // 保存快速模板供UI使用
    this.quickTemplates = QuickStyleTemplates;

  }

  /**
   * 初始化CSS预处理器
   * 新增功能：支持@装饰语法
   */
  async initCSSPreprocessor() {

    // 创建预处理器实例
    this.cssPreprocessor = new CSSPreprocessor(this);

    // 初始化预处理器
    this.cssPreprocessor.init();

  }



  /**
   * 加载设置
   */
  async loadSettings() {
    this.enabled = await this.storage.get('visualEditor_enabled', false); // 🎛️ 改为默认关闭
    this.appliedStyles = new Map(await this.storage.get('visualEditor_appliedStyles', []));
    this.currentTheme = await this.storage.get('visualEditor_currentTheme', null);

    // 如果启用，从自定义CSS中解析已应用的样式
    if (this.enabled) {
      this.parseAppliedStyles();

      // 🚀 页面刷新时自动显示可视化编辑器（如果已勾选）
      setTimeout(() => {
        const customCSSBlock = document.querySelector('#CustomCSS-textAreaBlock');
        if (customCSSBlock) {
          this.insertEditorPanel();

          // 🔍 执行输入框操作检查
          const customCSS = document.querySelector('#customCSS');
          if (customCSS && customCSS.value.trim()) {
            this.triggerCSSCompilation(customCSS.value);
          }
        }
      }, 500); // 延迟确保DOM已加载
    }
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    await this.storage.set('visualEditor_enabled', this.enabled);
    await this.storage.set('visualEditor_appliedStyles', Array.from(this.appliedStyles.entries()));
    await this.storage.set('visualEditor_currentTheme', this.currentTheme);
  }

  /**
   * 获取标签页配置（用于设置页面 - 界面统一版）
   */
  getTabConfig() {
    return {
      id: 'visual-editor',
      title: '可视化编辑器',
      icon: 'fa-palette',
      ui: class SimpleToggleUI {
        constructor(module) {
          this.module = module;
          this.container = null;
        }

        init(container) {
          this.container = container;
          this.render();
        }

        render() {
          if (!this.container) return;

          // 获取元素分类和统计
          const categories = this.module.registry.getCategories();
          const elementCount = this.module.registry.getAllElements().length;
          const categoryLabels = {
            message: '消息相关',
            input: '输入相关',
            character: '角色相关',
            worldbook: '世界书',
            layout: '布局',
            controls: '控件',
            popup: '弹窗'
          };

          // 获取预处理器统计
          const preprocessorStats = this.module.cssPreprocessor ?
            this.module.cssPreprocessor.getStats() :
            { rulesCount: 0, decoratedElements: 0 };

          this.container.innerHTML = `
            <div class="enhanced-section visual-editor-section">
              <!-- 功能开关 - 与其他页面保持一致的样式 -->
              <div class="visual-editor-enable-section-compact">
                <label class="checkbox_label">
                  <input type="checkbox" id="ve-enable-toggle" ${this.module.enabled ? 'checked' : ''}>
                  <span>启用可视化CSS编辑器</span>
                  <span class="hint-inline">在用户设置的"自定义CSS"下方显示可视化编辑面板</span>
                </label>
              </div>
              
              <div class="visual-editor-info-section">
                <div class="info-item">
                  <span class="info-icon">ℹ️</span>
                  <span>现在使用原生SillyTavern实时预览机制，样式修改会立即显示</span>
                </div>
              </div>
              
              <!-- 功能标题 - 与其他页面保持一致 -->
              <div class="section-header">
                <h4>可视化CSS编辑器</h4>
              </div>
              
              <!-- 功能说明 -->
              <div class="visual-editor-description">
                <p>可视化编辑器提供图形界面来编辑 ${elementCount} 种元素的样式，包括颜色、字体、边框、间距等属性。</p>
                <p style="color: var(--SmartThemeQuoteColor); font-weight: bold;">
                  ✨ 新功能：支持@装饰语法，可在CSS中直接添加装饰元素！
                </p>
              </div>
              
              <!-- CSS装饰语法说明 -->
              <div class="visual-editor-decoration-section" style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 4px;">
                <h5 style="margin: 0 0 8px 0; color: var(--SmartThemeQuoteColor);">
                  <i class="fa fa-magic"></i> CSS装饰语法
                </h5>
                <p style="font-size: 0.85em; margin: 5px 0;">在自定义CSS中使用 <code>@元素：装饰名</code> 语法添加装饰：</p>
                <pre style="background: rgba(0,0,0,0.1); padding: 8px; border-radius: 3px; font-size: 0.8em; margin: 8px 0;">
@头像：光环 {
  宽度: 120像素
  高度: 120像素
  背景图片: url(光环.png)
  位置: 绝对
  顶部: -10像素
}

@角色消息：贴纸 {
  背景图片: url(贴纸.png)
  位置: 绝对
  顶部: -20像素
  右边: 10像素
}</pre>
                <p style="font-size: 0.8em; opacity: 0.8;">
                  当前装饰规则：${preprocessorStats.rulesCount} 条 | 
                  已装饰元素：${preprocessorStats.decoratedElements} 个
                </p>
              </div>
              
              <!-- 可编辑元素分类 -->
              <div class="visual-editor-categories">
                <h5>可编辑元素分类</h5>
                <div class="category-list">
                  ${categories.map(cat => {
            const elements = this.module.registry.getElementsByCategory(cat);
            const label = categoryLabels[cat] || cat;
            return `
                      <div class="category-item">
                        <span class="category-name">${label}</span>
                        <span class="category-count">${elements.length} 个元素</span>
                      </div>
                    `;
          }).join('')}
                </div>
              </div>
              
              <!-- 主题管理 -->
              <div class="visual-editor-theme-section">
                <h5>主题管理</h5>
                <div class="theme-actions">
                  <button id="ve-export-theme" class="menu_button compact">
                    <i class="fa fa-download"></i> 导出主题
                  </button>
                  <button id="ve-import-theme" class="menu_button compact">
                    <i class="fa fa-upload"></i> 导入主题
                  </button>
                </div>
                <p class="hint">导出的主题使用中文格式，需要本扩展才能正确解析</p>
              </div>
              
              <!-- 使用说明 -->
              <div class="visual-editor-help">
                <h5>使用说明</h5>
                <ol class="help-list">
                  <li>启用后，打开用户设置中的"自定义CSS"部分</li>
                  <li>在CSS输入框下方会出现可视化编辑面板</li>
                  <li>选择要编辑的元素，调整其样式属性</li>
                  <li>使用@语法可以添加装饰元素（如贴纸、光环等）</li>
                  <li>修改会通过原生机制立即生效</li>
                  <li>导出的主题为人类可读的中文格式</li>
                </ol>
              </div>
              
              <!-- 统计信息 - 使用主题色彩 -->
              <div class="stats-section">
                <h5>统计信息</h5>
                <div id="visual-editor-stats" class="stats-grid">
                  <div class="stat-item">
                    <span class="stat-label">已注册元素</span>
                    <span class="stat-value">${elementCount}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">待应用规则</span>
                    <span class="stat-value">${this.module.pendingStyles.size}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">已保存规则</span>
                    <span class="stat-value">${this.module.appliedStyles.size}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">装饰规则</span>
                    <span class="stat-value">${preprocessorStats.rulesCount}</span>
                  </div>
                </div>
              </div>
            </div>
          `;

          // 绑定事件
          document.getElementById('ve-enable-toggle')?.addEventListener('change', (e) => {
            this.module.setEnabled(e.target.checked);
          });


          document.getElementById('ve-export-theme')?.addEventListener('click', () => {
            this.module.exportChineseTheme();
          });

          document.getElementById('ve-import-theme')?.addEventListener('click', () => {
            this.module.importTheme();
          });

        }

        refresh() {
          this.render();
        }
      },
      order: 3
    };
  }


  /**
   * 清除单个元素的样式（新增统一清除方法）
   */
  clearElement(selector) {
    // 🚀 统一调用注册中心的清除方法
    this.registry.clearElementStyle(selector);

    // 清除主模块的数据
    this.pendingStyles.delete(selector);

    // ✅ 直接应用到CSS输入框，让原生机制处理
    this.applyStylesToCSS();

  }

  /**
   * 导出中文格式主题
   */
  exportChineseTheme() {
    const name = prompt('请输入主题名称：');
    if (!name) return;

    const description = prompt('请输入主题描述（可选）：');
    const author = prompt('请输入作者名称（可选）：') || '可视化编辑器用户';

    // 使用中文格式解析器导出
    const result = this.formatParser.exportTheme(this.appliedStyles, {
      name,
      description,
      author,
      tags: ['visual-editor', 'chinese-format']
    });

    // 下载文件
    const blob = new Blob([result.css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);

    this.showMessage(`主题已导出为中文格式（${result.filename}）`, 'success');
  }

  /**
   * 导入主题
   */
  async importTheme() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.css,.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const content = await file.text();

      // 使用中文格式解析器导入
      const result = this.formatParser.importTheme(content);

      if (result.success) {
        this.pendingStyles = result.styles;

        // ✅ 直接应用到CSS输入框
        this.applyStylesToCSS();

        if (this.ui) {
          this.ui.refresh();
        }

        const format = result.metadata.format === 'chinese' ? '中文格式' : 'CSS格式';
        this.showMessage(`已成功导入${format}主题: "${result.metadata.name}"`, 'success');
      } else {
        this.showMessage(`导入失败: ${result.error}`, 'error');
      }
    };

    input.click();
  }

  /**
   * 初始化智能监听协调器
   * 替换原有的分散监听器，实现统一管理
   */
  async initSmartListener() {
    try {
      this.smartListener = new SmartListenerCoordinator(this, this.cssPreprocessor);
      this.smartListener.init();

    } catch (error) {
      console.error('[VisualEditor] 智能监听协调器初始化失败:', error);
      throw error;
    }
  }


  /**
   * 触发CSS编译
   * 由智能协调器调用，处理输入框中的中文CSS
   */
  triggerCSSCompilation(cssText) {

    try {
      // 解析输入的中文CSS，更新pendingStyles
      this.parseAndUpdateFromInput(cssText);

      // 触发编译和应用
      if (this.pendingStyles.size > 0) {
        this.applyStylesToCSS();
      }
    } catch (error) {
      console.error('[VisualEditor] CSS编译失败:', error);
    }
  }


  /**
   * 插入编辑器面板
   */
  insertEditorPanel() {
    if (this.panelInserted) return;

    const customCSSBlock = document.querySelector('#CustomCSS-textAreaBlock');
    if (!customCSSBlock) return;


    // 创建面板容器
    const panel = document.createElement('div');
    panel.id = 'visual-editor-inline-panel';
    panel.className = 'visual-editor-inline-panel';

    // 插入到自定义CSS输入框下方
    customCSSBlock.insertAdjacentElement('afterend', panel);

    // 初始化UI（使用新架构）
    this.ui = new VisualEditorUI(this, this.registry, this.panelsFactory);
    this.ui.init(panel);

    this.panelInserted = true;

    // ⚡ 强制初始化智能协调器（无延迟，解决重置后不初始化问题）
    if (this.cssPreprocessor && this.enabled) {
      this.cssPreprocessor.initSmartCoordinator();
    }

    // 解析现有CSS
    this.parseExistingCSS();
  }

  /**
   * 移除编辑器面板
   */
  removeEditorPanel() {
    const panel = document.querySelector('#visual-editor-inline-panel');
    if (panel) {
      panel.remove();
      this.panelInserted = false;
      if (this.ui) {
        this.ui.destroy();
        this.ui = null;
      }
    }
  }

  /**
   * 启用/禁用编辑器
   */
  async setEnabled(enabled) {
    this.enabled = enabled;
    await this.saveSettings();

    if (enabled) {
      const customCSSBlock = document.querySelector('#CustomCSS-textAreaBlock');
      if (customCSSBlock) {
        this.insertEditorPanel();
      }

      // 启用CSS预处理器（智能协调器将在UI渲染后初始化）
      if (this.cssPreprocessor) {
        // 重新处理现有CSS
        const customCSS = document.querySelector('#customCSS');
        if (customCSS && customCSS.value) {
          if (this.cssPreprocessor && this.enabled) {
            this.cssPreprocessor.processCSS(customCSS.value);
          }
        }
      }
    } else {
      this.removeEditorPanel();

      // 清理装饰元素但保留CSS
      if (this.cssPreprocessor) {
        this.cssPreprocessor.destroy();
      }
    }

    this.eventBus.emit('visualEditor:enabledChanged', enabled);
  }


  /**
   * 查找中文格式内容的边界
   */
  findChineseFormatBounds(cssText) {
    const lines = cssText.split('\n');
    let startLine = -1;
    let endLine = -1;
    let inChineseBlock = false;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 检查是否是中文格式开始（分类标题如 "# 消息样式"）
      if (this.CHINESE_START_PATTERN.test(line) && startLine === -1) {
        startLine = i;
        inChineseBlock = true;
        continue;
      }

      // 如果在中文块中
      if (inChineseBlock) {
        // 计算大括号
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) braceCount--;

        // 如果遇到了非中文格式的内容（比如英文CSS或其他标记）
        if (braceCount === 0 && !this.CHINESE_START_PATTERN.test(line) &&
          !this.CHINESE_BLOCK_PATTERN.test(line) &&
          !line.includes('{') && !line.includes('}') &&
          line && !line.startsWith('#')) {
          // 检查下一行是否还是中文格式
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (!this.CHINESE_START_PATTERN.test(nextLine) &&
              !this.CHINESE_BLOCK_PATTERN.test(nextLine) &&
              nextLine && !nextLine.includes(':')) {
              endLine = i;
              break;
            }
          }
        }
      }
    }

    // 如果没找到结束位置，查找预览标记或文件结尾
    if (startLine !== -1 && endLine === -1) {
      for (let i = startLine + 1; i < lines.length; i++) {
        if (lines[i].includes('===') || lines[i].includes('Visual CSS') ||
          lines[i].includes('Preview')) {
          endLine = i - 1;
          break;
        }
      }
      // 如果还是没找到，设为最后一个非空行
      if (endLine === -1) {
        for (let i = lines.length - 1; i >= startLine; i--) {
          if (lines[i].trim()) {
            endLine = i;
            break;
          }
        }
      }
    }

    if (startLine !== -1 && endLine !== -1) {
      // 计算字符位置
      let startPos = 0;
      for (let i = 0; i < startLine; i++) {
        startPos += lines[i].length + 1; // +1 for newline
      }

      let endPos = 0;
      for (let i = 0; i <= endLine; i++) {
        endPos += lines[i].length + 1;
      }

      return { start: startPos, end: endPos };
    }

    return null;
  }

  /**
   * 解析现有CSS（包括中文格式）
   */
  parseExistingCSS() {
    // 获取CSS文本
    let cssText = '';

    // 尝试获取 power_user 对象
    const context = typeof SillyTavern !== 'undefined' ?
      SillyTavern.getContext() :
      (typeof window !== 'undefined' ? window : {});

    if (context.powerUserSettings && context.powerUserSettings.custom_css) {
      cssText = context.powerUserSettings.custom_css;
    } else {
      const customCSS = document.querySelector('#customCSS');
      if (customCSS) {
        cssText = customCSS.value;
      }
    }

    // 查找中文格式内容
    const bounds = this.findChineseFormatBounds(cssText);
    if (bounds) {
      const chineseContent = cssText.substring(bounds.start, bounds.end);

      // 解析中文格式
      const styles = this.formatParser.parseChineseFormat(chineseContent);
      if (styles.size > 0) {
        // 确保两个都是新的Map副本，避免引用问题
        this.appliedStyles = new Map(styles);
        this.pendingStyles = new Map(styles);
      }
    }

    // 解析预览中的样式
    const previewStartIndex = cssText.indexOf(this.PREVIEW_START_MARKER);
    const previewEndIndex = cssText.indexOf(this.PREVIEW_END_MARKER);

    if (previewStartIndex !== -1 && previewEndIndex !== -1) {
      const previewContent = cssText.substring(
        previewStartIndex + this.PREVIEW_START_MARKER.length,
        previewEndIndex
      ).trim();

      // 🔧 修复：页面刷新时不恢复到pendingStyles，避免绿点重新出现
      // 解析中文格式内容，但放到appliedStyles表示已保存状态  
      const previewStyles = this.formatParser.parseChineseFormat(previewContent);
      for (const [selector, properties] of previewStyles) {
        this.appliedStyles.set(selector, properties);
      }

      // pendingStyles保持空白，表示"干净状态"（无绿点）
    }

    // 处理装饰语法
    if (this.cssPreprocessor && this.enabled && cssText) {
      this.cssPreprocessor.processCSS(cssText);
    }
  }

  /**
   * 从自定义CSS中解析已应用的样式
   */
  parseAppliedStyles() {
    this.parseExistingCSS();
  }

  /**
   * 更新样式
   */
  updateStyle(selector, property, value) {
    if (!this.pendingStyles.has(selector)) {
      this.pendingStyles.set(selector, {});
    }
    const rule = this.pendingStyles.get(selector);

    if (value) {
      rule[property] = value;
    } else {
      delete rule[property];
      // 如果规则为空，删除整个selector
      if (Object.keys(rule).length === 0) {
        this.pendingStyles.delete(selector);
      }
    }

    // ✅ 直接应用到CSS输入框，让原生机制处理
    this.applyStylesToCSS();

    this.addToHistory();

    if (this.ui) {
      this.ui.updatePreview();
    }
  }



  /**
   * 获取当前CSS
   */
  getCurrentCSS() {
    // 尝试获取 power_user 对象
    const context = typeof SillyTavern !== 'undefined' ?
      SillyTavern.getContext() :
      (typeof window !== 'undefined' ? window : {});

    if (context.powerUserSettings && context.powerUserSettings.custom_css !== undefined) {
      return context.powerUserSettings.custom_css || '';
    }

    const customCSSElement = document.querySelector('#customCSS');
    if (customCSSElement) {
      return customCSSElement.value || '';
    }

    return '';
  }

  /**
   * 📌 将pending样式编译并应用到CSS输入框
   * 功能：pendingStyles → 中文CSS + 标准CSS → SillyTavern
   * 遵循原生SillyTavern理念：单一数据源，直接替换
   */
  applyStylesToCSS() {
    // 遵循原生理念：获取SillyTavern上下文
    const context = typeof SillyTavern !== 'undefined' ?
      SillyTavern.getContext() :
      (typeof window !== 'undefined' ? window : {});

    if (!context.powerUserSettings) {
      console.warn('[VisualEditor] 无法访问powerUserSettings，跳过CSS应用');
      return;
    }

    // 🚀 智能合并：现有内容 + 新修改内容
    const customCSSElement = document.querySelector('#customCSS');
    let currentCSS = '';

    // 获取当前输入框内容
    if (customCSSElement && customCSSElement.value) {
      currentCSS = customCSSElement.value;
    } else if (context.powerUserSettings.custom_css) {
      currentCSS = context.powerUserSettings.custom_css;
    }

    // 解析现有的中文CSS内容
    const existingStyles = this.formatParser.parseChineseFormat(currentCSS);

    // 智能合并：现有样式 + 新修改的样式（新修改的会覆盖现有的）
    const mergedStyles = new Map([...existingStyles, ...this.pendingStyles]);

    // 生成合并后的中文CSS（用户可见）
    const chineseCSS = this.formatParser.generateChineseFormat(mergedStyles);

    // 生成标准CSS（系统使用）
    const standardCSS = this.generator.generate(mergedStyles, {
      minify: false,
      addComments: false,
      useImportant: true
    });

    // 更新数据层和显示层
    context.powerUserSettings.custom_css = chineseCSS; // 数据层（中文）

    if (customCSSElement) {
      customCSSElement.value = chineseCSS; // 显示层（中文）
    }


    // 自实现原生逻辑：应用层（关键差异：应用编译后的标准CSS）
    let style = document.getElementById('custom-style');
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('id', 'custom-style');
      document.head.appendChild(style);
    }
    style.innerHTML = standardCSS; // 应用编译后的标准CSS

    // 调用原生保存机制
    if (typeof context.saveSettingsDebounced === 'function') {
      context.saveSettingsDebounced();
    }

  }

  /**
   * 应用CSS到页面（使用可靠的直接DOM操作）
   * 修复日期：2025-09-12 - 经测试验证，context.powerUserSettings写入不会更新DOM
   */
  applyCSS(cssText) {

    const customCSSElement = document.querySelector('#customCSS');
    if (customCSSElement) {
      // 🔧 如果CSS为空，清除所有额外样式
      if (!cssText || cssText.trim() === '') {
        this.clearAllAdditionalCSS();
      }

      // 🎯 直接操作DOM - 唯一可靠的方法
      customCSSElement.value = cssText;

      // 触发input和change事件，确保原生监听器接收到变化
      customCSSElement.dispatchEvent(new Event('input', { bubbles: true }));
      customCSSElement.dispatchEvent(new Event('change', { bubbles: true }));

      // 手动创建/更新style标签确保样式立即生效
      let style = document.getElementById('custom-style');
      if (!style) {
        style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.setAttribute('id', 'custom-style');
        document.head.appendChild(style);
      }
      style.innerHTML = cssText;


      // 🔄 尝试通过context保存设置（如果可用）
      try {
        const context = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : null;
        if (context?.powerUserSettings) {
          context.powerUserSettings.custom_css = cssText;
        }
        if (context?.saveSettingsDebounced) {
          context.saveSettingsDebounced();
        }
      } catch (e) {
      }
    } else {
      console.error('[VisualEditor] #customCSS元素不存在，无法应用CSS');
    }
  }


  /**
   * 获取指定元素的当前样式（通用批量应用支持）
   * @param {string} selector - CSS选择器
   * @returns {Object} 样式对象
   */
  getElementStyles(selector) {
    // 🔧 修复：合并appliedStyles和pendingStyles，pendingStyles优先
    const appliedStyles = this.appliedStyles.get(selector) || {};
    const pendingStyles = this.pendingStyles.get(selector) || {};

    // 合并样式：appliedStyles作为基础，pendingStyles覆盖
    const mergedStyles = { ...appliedStyles, ...pendingStyles };

    if (Object.keys(mergedStyles).length > 0) {
      return mergedStyles;
    }

    return {};
  }


  /**
   * 批量更新元素样式（通用批量应用支持）
   * @param {string} selector - CSS选择器
   * @param {Object} styles - 样式对象 {property: value, ...}
   */
  updateStyles(selector, styles) {
    if (!styles || typeof styles !== 'object') return;

    // 获取现有样式或创建新的样式对象
    let currentStyles = this.pendingStyles.get(selector) || {};

    // 批量更新属性
    Object.assign(currentStyles, styles);

    // 保存回 pendingStyles
    this.pendingStyles.set(selector, currentStyles);


    // 触发批量样式更新事件
    this.eventBus.emit('styles:batchUpdated', {
      selector,
      styles,
      allStyles: currentStyles
    });
  }

  /**
   * 从CSS中移除所有生成的内容
   */
  removeAllGeneratedCSS(cssText) {
    let cleanCSS = cssText;

    // 移除中文格式内容
    const bounds = this.findChineseFormatBounds(cleanCSS);
    if (bounds) {
      cleanCSS = cleanCSS.substring(0, bounds.start) + cleanCSS.substring(bounds.end);
    }

    // 预览内容已直接合并，无需特殊清理

    // 清理所有包含"视觉样式配置"或"undefined"的注释行
    const lines = cleanCSS.split('\n');
    const filteredLines = lines.filter(line => {
      return !line.includes('视觉样式配置') &&
        !line.includes('undefined') &&
        !line.includes('✨');
    });
    cleanCSS = filteredLines.join('\n');

    return cleanCSS.replace(/\n{3,}/g, '\n\n').trim();
  }



  /**
   * 应用额外CSS（如图标的特殊伪元素样式）
   * @param {string} cssText - 原始CSS文本
   */
  applyAdditionalCSS(cssText) {
    if (!cssText || typeof cssText !== 'string') return;

    // 添加到独立的样式元素中
    this.applyAdditionalCSSToPage(cssText);

  }


  /**
   * 将额外CSS添加到页面（非预览模式）
   */
  applyAdditionalCSSToPage(cssText) {
    let styleElement = document.getElementById('ve-additional-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 've-additional-styles';
      styleElement.setAttribute('data-source', 'visual-editor-additional');
      document.head.appendChild(styleElement);
    }

    // 添加到现有CSS中（避免重复）
    const currentCSS = styleElement.textContent || '';
    if (!currentCSS.includes(cssText.trim())) {
      styleElement.textContent = currentCSS + '\n' + cssText;
    }
  }

  /**
   * 清除所有额外的CSS样式元素和DOM内联样式（修复残留问题）
   * 重构版：统一4套清除机制，避免循环调用
   */
  clearAllAdditionalCSS() {

    let totalClearedCount = 0;

    // 1️⃣ 清除所有管理选择器的内联样式
    this.managedSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element && element.hasAttribute('style')) {
        element.removeAttribute('style');
        element.style.cssText = ''; // 双重保险
        totalClearedCount++;
      }
    });

    // 2️⃣ 调用注册中心的元素清除回调
    let callbackClearedCount = 0;
    this.managedSelectors.forEach(selector => {
      if (this.registry && this.registry.clearElementStyle(selector)) {
        callbackClearedCount++;
      }
    });

    // 3️⃣ 清除装饰元素
    if (this.cssPreprocessor) {
      this.cssPreprocessor.clearAllDecorations();
    }

    // 4️⃣ 清除各种CSS样式元素
    let styleElementsClearedCount = 0;

    // 清除固定的样式元素
    const additionalStyles = document.getElementById('ve-additional-styles');
    if (additionalStyles) {
      additionalStyles.remove();
      styleElementsClearedCount++;
    }

    const previewStyles = document.getElementById('ve-preview-styles');
    if (previewStyles) {
      previewStyles.remove();
      styleElementsClearedCount++;
    }

    // 清除所有ve-additional-*开头的样式元素
    const allVeAdditionalStyles = document.querySelectorAll('style[id^="ve-additional-"]');
    allVeAdditionalStyles.forEach(styleElement => {
      styleElement.remove();
      styleElementsClearedCount++;
    });

    // 5️⃣ 清除状态记录
    if (this.conflictingSelectors) {
      this.conflictingSelectors.clear();
    }

    // 清除pendingStyles和appliedStyles中的数据
    if (this.pendingStyles) {
      this.pendingStyles.clear();
    }
    if (this.appliedStyles) {
      this.appliedStyles.clear();
    }

    // 6️⃣ 强制触发样式重新计算
    document.body.offsetHeight; // 触发全局reflow

    // 📊 汇总清除结果
    const totalCleared = totalClearedCount + callbackClearedCount + styleElementsClearedCount;

    return totalCleared;
  }




  /**
   * 🔧 初始化简化CSS管理器
   */
  initSimpleCSSManager() {

    // 管理的选择器列表
    this.managedSelectors = [
      '#leftNavDrawerIcon',
      '#API-status-top',
      '#advanced-formatting-button .drawer-icon',
      '#WIDrawerIcon',
      '#user-settings-button .drawer-icon',
      '#logo_block .drawer-icon',
      '#extensions-settings-button .drawer-icon',
      '#persona-management-button .drawer-icon',
      '#rightNavDrawerIcon',
      '#send_but',
      '#mes_stop',
      '#options_button',
      '#extensionsMenuButton'
    ];


    // ✅ 注册全局手动清除方法
    this.setupManualCSSConflictResolver();
  }

  /**
   * 🛠️ 设置手动CSS冲突解决工具
   */
  setupManualCSSConflictResolver() {
    // 暴露到全局供控制台使用
    window.VisualEditorCSS = {
      /**
       * 手动检测内联样式
       */
      detectInlineStyles: () => {
        let hasInlineStyles = 0;

        this.managedSelectors.forEach(selector => {
          const element = document.querySelector(selector);
          if (element && element.hasAttribute('style')) {
            hasInlineStyles++;
          }
        });

        return hasInlineStyles;
      },

      /**
       * 手动清除内联样式
       */
      clearInlineStyles: () => {
        let clearedCount = 0;
        console.log('🧹 开始清除内联样式...');

        this.managedSelectors.forEach(selector => {
          const element = document.querySelector(selector);
          if (element && element.hasAttribute('style')) {
            element.removeAttribute('style');
            clearedCount++;
          }
        });

        // 强制重绘
        document.body.offsetHeight;

        return clearedCount;
      },

      /**
       * 解决CSS优先级冲突
       */
      resolveConflicts: () => {

        const inlineCount = window.VisualEditorCSS.detectInlineStyles();

        if (inlineCount === 0) {
          return;
        }

      }
    };

  }


  /**
   * 重置当前编辑
   */
  resetCurrentEdits() {
    // 重置pendingStyles为appliedStyles的深度副本
    this.pendingStyles = new Map();
    for (const [selector, styles] of this.appliedStyles) {
      this.pendingStyles.set(selector, { ...styles });
    }

    // 应用到CSS输入框
    this.applyStylesToCSS();

    this.editHistory = [];
    this.historyIndex = -1;

    if (this.ui) {
      this.ui.refresh();
    }
  }

  /**
   * 添加到历史记录
   */
  addToHistory() {
    this.editHistory = this.editHistory.slice(0, this.historyIndex + 1);

    // 创建深度副本保存到历史
    const stylesCopy = new Map();
    for (const [selector, styles] of this.pendingStyles) {
      stylesCopy.set(selector, { ...styles });
    }

    this.editHistory.push({
      timestamp: Date.now(),
      styles: stylesCopy
    });

    if (this.editHistory.length > this.maxHistorySize) {
      this.editHistory.shift();
    } else {
      this.historyIndex++;
    }
  }

  /**
   * 撤销
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.editHistory[this.historyIndex];

      // 创建深度副本
      this.pendingStyles = new Map();
      for (const [selector, styles] of state.styles) {
        this.pendingStyles.set(selector, { ...styles });
      }

      // ✅ 直接应用到CSS输入框
      this.applyStylesToCSS();

      if (this.ui) {
        this.ui.refresh();
      }
    }
  }

  /**
   * 重做
   */
  redo() {
    if (this.historyIndex < this.editHistory.length - 1) {
      this.historyIndex++;
      const state = this.editHistory[this.historyIndex];

      // 创建深度副本
      this.pendingStyles = new Map();
      for (const [selector, styles] of state.styles) {
        this.pendingStyles.set(selector, { ...styles });
      }

      // ✅ 直接应用到CSS输入框
      this.applyStylesToCSS();

      if (this.ui) {
        this.ui.refresh();
      }
    }
  }

  /**
   * 导出样式（使用中文格式）
   */
  exportStyles() {
    const name = `导出样式-${new Date().toLocaleDateString('zh-CN')}`;

    const result = this.formatParser.exportTheme(this.appliedStyles, {
      name,
      author: '可视化编辑器',
      description: '从可视化编辑器导出的样式配置'
    });

    const blob = new Blob([result.css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();

    URL.revokeObjectURL(url);
    this.showMessage('样式已导出（中文格式）', 'success');
  }

  /**
   * 导入样式
   */
  async importStyles(content) {
    try {
      const result = this.formatParser.importTheme(content);

      if (result.success) {
        this.pendingStyles = result.styles;
        this.currentTheme = result.metadata.name || null;

        // ✅ 直接应用到CSS输入框
        this.applyStylesToCSS();

        if (this.ui) {
          this.ui.refresh();
        }

        this.showMessage('样式已导入，请确认应用', 'info');
        return true;
      }

      return false;
    } catch (e) {
      console.error('[VisualEditor] 导入失败:', e);
      this.showMessage('导入失败：' + e.message, 'error');
      return false;
    }
  }

  /**
   * 处理主题切换事件
   * 修复：2025-01-09 - 确保装饰元素与原生CSS同步
   */
  handleThemeChange() {

    // 🔧 修复：主题切换时清理pendingStyles，重置绿点状态
    this.pendingStyles.clear();

    // 🚀 新增：清理CSS解析缓存，防止主题冲突
    if (this.formatParser && this.formatParser.smartCache) {
      this.formatParser.smartCache.clear();
    }

    // 清除定时器，避免重复执行
    if (this.themeChangeTimer) {
      clearTimeout(this.themeChangeTimer);
    }

    // 使用定时器确保主题切换完成后再处理
    this.themeChangeTimer = setTimeout(() => {
      // 1. 清理CSS预处理器的装饰
      if (this.cssPreprocessor) {
        this.cssPreprocessor.clearAllDecorations();

        // 2. 等待一小段时间让DOM更新
        setTimeout(() => {
          // 3. 重新获取并处理新主题的CSS
          const customCSS = document.querySelector('#customCSS');
          if (customCSS && customCSS.value && this.enabled) {
            if (this.cssPreprocessor) {
              this.cssPreprocessor.processCSS(customCSS.value);
            }
          }

          // 4. 重新解析CSS内容
          this.parseExistingCSS();

          // 5. 刷新UI
          if (this.ui) {
            this.ui.refresh();
          }
        }, 100); // 给DOM一点更新时间
      }
    }, 50); // 短暂延迟，确保主题切换操作完成
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听主题变化事件
    // 使用统一的处理方法，避免重复代码
    this.eventBus.on('theme:changed', () => {
      this.handleThemeChange();
    });

    // 监听设置按钮点击
    document.addEventListener('click', (e) => {
      if (e.target.closest('#rm_button_settings')) {
        setTimeout(() => {
          if (this.enabled && !this.panelInserted) {
            const customCSSBlock = document.querySelector('#CustomCSS-textAreaBlock');
            if (customCSSBlock) {
              this.insertEditorPanel();
            }
          }
        }, 100);
      }
    });

    // 监听主题下拉框变化（备用方案）
    // 有时theme:changed事件可能不触发，直接监听下拉框
    const watchThemeSelect = () => {
      const themeSelect = document.querySelector('#themes');
      if (themeSelect && !themeSelect.dataset.visualEditorAttached) {
        themeSelect.dataset.visualEditorAttached = 'true';
        themeSelect.addEventListener('change', () => {
          this.handleThemeChange();
        });
      }
    };

    // 一次性初始化主题下拉框监听器
    watchThemeSelect();

    // 🔧 启用简化CSS优先级管理机制
    this.initSimpleCSSManager();

    // 🎯 启用实时CSS编译机制
    this.initRealtimeCSSCompiler();

  }

  /**
   * 显示消息
   */
  showMessage(message, type = 'info') {
    if (this.extension && this.extension.showToast) {
      this.extension.showToast(message, type);
    } else {
    }
  }

  /**
   * 获取元素样式
   */
  getElementStyles(selector) {
    return this.pendingStyles.get(selector) || {};
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const preprocessorStats = this.cssPreprocessor ?
      this.cssPreprocessor.getStats() :
      { rulesCount: 0, decoratedElements: 0, isObserving: false };

    return {
      enabled: this.enabled,
      pendingRules: this.pendingStyles.size,
      appliedRules: this.appliedStyles.size,
      historySize: this.editHistory.length,
      currentTheme: this.currentTheme,
      registeredElements: this.registry ? this.registry.getAllElements().length : 0,
      categories: this.registry ? this.registry.getCategories().length : 0,
      decorationRules: preprocessorStats.rulesCount,
      decoratedElements: preprocessorStats.decoratedElements,
      isObservingNewElements: preprocessorStats.isObserving
    };
  }


  /**
   * 🎯 初始化实时CSS编译机制
   * 功能：监听输入框中文CSS变化，实时编译为标准CSS并应用（创作者模式）
   */
  initRealtimeCSSCompiler() {

    // 编译缓存（避免重复编译）
    this.cssCompilerCache = new Map();
    this.compilerModeActive = false;
    this.compilerTimer = null;

    // 查找CSS输入框（延迟查找，确保DOM已加载）
    const initCompiler = () => {
      const customCSS = document.querySelector('#customCSS');
      if (customCSS) {
        this.bindRealtimeCSSCompiler(customCSS);
      } else {
        // 延迟重试
        setTimeout(initCompiler, 500);
      }
    };

    // 延迟初始化
    setTimeout(initCompiler, 100);
  }

  /**
   * 绑定实时CSS编译器
   */
  bindRealtimeCSSCompiler(customCSS) {
    // 防抖处理（300ms）
    const debouncedCompiler = this.debounce((cssText) => {
      this.compileAndApplyCSS(cssText);
    }, 300);

    // 监听输入事件
    customCSS.addEventListener('input', (e) => {
      // 激活创作者模式（1分钟）
      this.activateCompilerMode();

      // 如果在创作者模式下，进行实时编译
      if (this.compilerModeActive) {
        debouncedCompiler(e.target.value);
      }
    });

    // 监听粘贴事件（处理导入场景）
    customCSS.addEventListener('paste', (e) => {
      setTimeout(() => {
        this.activateCompilerMode();
        if (this.compilerModeActive) {
          debouncedCompiler(e.target.value);
        }
      }, 100);
    });
  }

  /**
   * 激活创作者编译模式（临时1分钟）
   */
  activateCompilerMode() {
    if (!this.compilerModeActive) {
      this.compilerModeActive = true;
    }

    // 重置定时器（每次编辑都重新计时1分钟）
    if (this.compilerTimer) {
      clearTimeout(this.compilerTimer);
    }

    // 1分钟后自动关闭
    this.compilerTimer = setTimeout(() => {
      this.compilerModeActive = false;
    }, 60000); // 60秒
  }

  /**
   * 编译并应用CSS
   */
  compileAndApplyCSS(cssText) {
    if (!cssText || !cssText.trim()) return;

    // 缓存检查
    const cacheKey = cssText.trim();
    if (this.cssCompilerCache.has(cacheKey)) {
      const cachedResult = this.cssCompilerCache.get(cacheKey);
      this.applyCompiledCSS(cachedResult.input, cachedResult.compiled);
      return;
    }

    try {
      // 检测是否包含中文CSS
      const chineseFormatRegex = /[\u4e00-\u9fff]+\s*\{/;
      if (chineseFormatRegex.test(cssText)) {

        // 解析中文CSS
        const parsedStyles = this.formatParser.parseChineseFormat(cssText);

        if (parsedStyles && parsedStyles.size > 0) {
          // 编译为标准CSS
          const compiledCSS = this.generator.generate(parsedStyles, {
            minify: false,
            addComments: false
          });

          // 缓存结果（最多缓存10个）
          if (this.cssCompilerCache.size >= 10) {
            const firstKey = this.cssCompilerCache.keys().next().value;
            this.cssCompilerCache.delete(firstKey);
          }
          this.cssCompilerCache.set(cacheKey, { input: cssText, compiled: compiledCSS });

          // 应用编译后的CSS
          this.applyCompiledCSS(cssText, compiledCSS);

        }
      }
      // 如果不是中文CSS，则不处理（保持原样）

    } catch (error) {
      console.error('[VisualEditor] ❌ CSS编译失败:', error);
    }
  }

  /**
   * 应用编译后的CSS - 重构版：直接应用，避免循环
   * ✅ 解决循环问题：不再触发input事件
   */
  applyCompiledCSS(originalCSS, compiledCSS) {
    if (!compiledCSS) return;


    // 🎯 保存中文CSS到SillyTavern数据层（安全的覆盖式保存）
    const context = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : null;
    if (context?.powerUserSettings) {
      context.powerUserSettings.custom_css = originalCSS; // 保存中文CSS

      // 防抖保存设置（不会重复累积）
      if (context.saveSettingsDebounced) {
        context.saveSettingsDebounced();
      }
    }

    // 🎨 直接应用标准CSS到应用层（不触发input事件！）
    let style = document.getElementById('custom-style');
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('id', 'custom-style');
      document.head.appendChild(style);
    }

    // ✅ 关键修复：直接更新CSS内容，不触发任何事件
    style.innerHTML = compiledCSS;

    // 🔄 确保输入框显示与数据层同步（不触发事件）
    this.syncInputBoxDisplay(originalCSS);

    // 🚫 删除这些导致循环的代码：
    // customCSS.value = compiledCSS;  ← 这会触发SmartListener
    // customCSS.dispatchEvent(new Event('input')); ← 这会导致无限循环
    // setTimeout(() => { customCSS.value = originalValue; }, 50); ← 这也会触发循环
  }

  /**
   * 🔄 同步输入框显示内容（不触发事件）
   * 确保用户看到的是中文CSS，而不是编译后的标准CSS
   */
  syncInputBoxDisplay(chineseCSS) {
    const customCSS = document.querySelector('#customCSS');
    if (customCSS && customCSS.value !== chineseCSS) {
      // 🚨 关键：临时移除事件监听器，避免触发循环
      const smartListener = this.smartListener;
      if (smartListener && typeof smartListener.setupInputFocusDetection === 'function') {
        // 暂时标记为"正在同步"状态
        smartListener.isSync = true;
      }

      // 直接更新输入框内容
      customCSS.value = chineseCSS;

      // 恢复事件监听状态
      setTimeout(() => {
        if (smartListener) {
          smartListener.isSync = false;
        }
      }, 10); // 非常短的延迟，确保当前调用栈完成
    }
  }

  /**
   * 触发CSS编译 - 供SmartListenerCoordinator调用
   * 解析CSS并发送解析事件，供反向同步使用
   */
  triggerCSSCompilation(cssText) {
    try {
      // 解析中文CSS为内部数据结构
      const parsedStyles = this.formatParser.parseChineseFormat(cssText);

      if (parsedStyles && parsedStyles.size > 0) {
        // 更新待处理样式
        this.pendingStyles = parsedStyles;

        // 发送解析事件（供反向同步使用）
        this.eventBus.emit('styles:parsed', parsedStyles);

        // 编译并应用CSS
        this.compileAndApplyCSS(cssText);

      }
    } catch (error) {
      console.error('[VisualEditor] CSS编译失败:', error);
    }
  }

  /**
   * 从输入框解析并更新 - 供反向同步使用
   * 这是备用方法，主要逻辑在triggerCSSCompilation中
   */
  parseAndUpdateFromInput(cssText) {
    // 直接调用主要方法
    this.triggerCSSCompilation(cssText);
  }

  /**
   * 销毁模块
   * 清理所有资源
   */
  destroy() {

    // 停止DOM观察
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // 清理定时器
    if (this.cssInputTimer) {
      clearTimeout(this.cssInputTimer);
      this.cssInputTimer = null;
    }

    if (this.themeChangeTimer) {
      clearTimeout(this.themeChangeTimer);
      this.themeChangeTimer = null;
    }

    // 清理CSS编译器
    if (this.compilerTimer) {
      clearTimeout(this.compilerTimer);
      this.compilerTimer = null;
    }
    if (this.cssCompilerCache) {
      this.cssCompilerCache.clear();
    }
    this.compilerModeActive = false;

    // 销毁CSS预处理器
    if (this.cssPreprocessor) {
      this.cssPreprocessor.destroy();
      this.cssPreprocessor = null;
    }


    // 移除编辑器面板
    this.removeEditorPanel();

    // 清理其他资源
    this.pendingStyles.clear();
    this.appliedStyles.clear();
    this.editHistory = [];

  }
}