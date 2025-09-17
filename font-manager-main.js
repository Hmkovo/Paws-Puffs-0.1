/**
 * 字体管理器 - Google字体集成系统
 * 
 * 核心功能：
 * - 支持zeoseven.com字体链接解析和批量导入
 * - 字体的添加、删除、切换和标签分类管理
 * - 字体预览和实时应用功能
 * - 导入导出配置，云端同步支持
 */

import { FontManagerUI } from './font-manager-ui.js';

export class FontManagerModule {
  constructor(extension) {
    this.extension = extension;
    this.storage = extension.storage;
    this.eventBus = extension.eventBus;

    // 字体列表
    this.fonts = new Map(); // key: fontName, value: font object
    this.currentFont = null;

    // 标签系统
    this.tags = new Set();
    this.currentTag = 'all'; // 当前筛选的标签

    // 字体功能启用状态
    this.fontEnabled = true;

    // UI实例
    this.ui = null;

    this.moduleId = 'font-manager';
  }

  /**
   * 初始化字体管理器
   * 修改：2025-09-05 修复currentFont加载逻辑，优先从fonts数据中读取
   */
  async init() {
    // 加载保存的字体
    await this.loadFonts();

    // 加载字体启用状态
    const savedFontEnabled = await this.storage.get('fontEnabled');
    if (savedFontEnabled !== undefined) {
      this.fontEnabled = savedFontEnabled;
    }

    // 修复：确保currentFont正确加载
    // 优先使用单独保存的currentFont，如果没有则使用fonts数据中的
    const savedCurrentFont = await this.storage.get('currentFont');
    if (savedCurrentFont && this.fonts.has(savedCurrentFont)) {
      this.currentFont = savedCurrentFont;
    }
    // 如果currentFont有效且字体功能启用，应用字体
    if (this.currentFont && this.fontEnabled) {
      const currentFontData = this.fonts.get(this.currentFont);
      if (currentFontData) {
        this.applyFont(currentFontData);
      }
    }

    console.log('[FontManagerModule] 字体管理器初始化完成，已加载', this.fonts.size, '个字体，字体功能', this.fontEnabled ? '已启用' : '已禁用');
  }

  /**
   * 设置字体功能启用状态
   * @param {boolean} enabled - 是否启用字体功能
   */
  async setFontEnabled(enabled) {
    this.fontEnabled = enabled;
    await this.storage.set('fontEnabled', enabled);

    // 如果禁用字体功能，清除应用的字体
    if (!enabled) {
      this.clearAppliedFont();
    } else if (this.currentFont) {
      // 如果启用字体功能，且有当前选中的字体，重新应用
      const font = this.fonts.get(this.currentFont);
      if (font) {
        this.applyFont(font);
      }
    }

    // 发布事件
    this.eventBus.emit('font:enabledChanged', enabled);

    console.log('[FontManagerModule] 字体功能', enabled ? '已启用' : '已禁用');
  }

  /**
     * 应用字体到页面
     * @param {Object} font - 字体对象
     */
  applyFont(font) {
    // 只有在字体功能启用时才应用
    if (!this.fontEnabled) {
      console.log('[FontManagerModule] 字体功能已禁用，跳过应用字体');
      return;
    }

    // 清除之前的字体样式
    this.clearAppliedFont();

    // 创建新的字体样式
    const styleId = 'enhanced-font-style';
    const style = document.createElement('style');
    style.id = styleId;

    // 生成完整的字体CSS
    let css = '';

    // 添加字体导入
    if (font.url) {
      css += `@import url("${font.url}");\n\n`;
    }

    // 应用到所有需要的元素（这是完整列表！）
    if (font.fontFamily) {
      css += `
      body, input, textarea, select, button, .mes_text, .mes_block, 
      pre, code, h1, h2, h3, h4, h5, h6, .title_restorable,
      .font-family-reset, #options span, 
      #completion_prompt_manager_list span:not([class*="fa-"]), 
      .text_pole span:not([class*="fa-"]),
      .flex-container, .swipes-counter {
        font-family: '${font.fontFamily}', sans-serif !important;
      }`;
    }

    // 如果有完整的CSS内容，则追加
    if (font.css && !font.css.includes('font-family')) {
      css = font.css + '\n' + css;
    } else if (font.css) {
      css = font.css;
    }

    style.textContent = css;
    document.head.appendChild(style);
    console.log('[FontManagerModule] 已应用字体:', font.name);
  }

  /**
   * 清除应用的字体
   */
  clearAppliedFont() {
    const existingStyle = document.getElementById('enhanced-font-style');
    if (existingStyle) {
      existingStyle.remove();
      console.log('[FontManagerModule] 已清除应用的字体');
    }
  }

  /**
   * 删除标签
   * @param {string} tagToDelete - 要删除的标签
   */
  async deleteTag(tagToDelete) {
    if (!this.tags.has(tagToDelete)) {
      console.warn('[FontManagerModule] 标签不存在:', tagToDelete);
      return false;
    }

    // 从所有字体中移除该标签
    let modified = false;
    this.fonts.forEach((font, fontName) => {
      if (font.tags && font.tags.includes(tagToDelete)) {
        font.tags = font.tags.filter(tag => tag !== tagToDelete);
        modified = true;
        console.log(`[FontManagerModule] 从字体 "${fontName}" 中移除标签 "${tagToDelete}"`);
      }
    });

    // 从标签集合中删除
    this.tags.delete(tagToDelete);

    // 如果当前筛选的是被删除的标签，重置为all
    if (this.currentTag === tagToDelete) {
      this.currentTag = 'all';
    }

    // 保存更改
    if (modified) {
      await this.saveFonts();
    }

    // 发布事件
    this.eventBus.emit('font:tagsChanged', { action: 'deleted', tag: tagToDelete });

    console.log('[FontManagerModule] 已删除标签:', tagToDelete);
    return true;
  }

  /**
   * 解析字体链接（支持zeoseven.com格式）
   * @param {string} input - 输入的字体代码
   * @returns {Object|null} 解析后的字体对象
   */
  parseFont(input, customName = null) {
    // 匹配 @import url 格式
    const importMatch = input.match(/@import\s+url\(["']([^"']+)["']\)/);
    if (!importMatch) {
      console.warn('[FontManagerModule] 无法解析字体链接');
      return null;
    }

    const url = importMatch[1];

    // 匹配 font-family
    const familyMatch = input.match(/font-family:\s*["']?([^"';]+)["']?/);
    const fontFamily = familyMatch ? familyMatch[1].trim() : (customName || 'Unknown Font');

    // 从URL中提取字体ID（如果是zeoseven链接）
    let fontId = null;
    const idMatch = url.match(/fontsapi\.zeoseven\.com\/(\d+)\//);
    if (idMatch) {
      fontId = idMatch[1];
    }

    // 生成默认名称
    const defaultName = customName || fontFamily || `Font-${Date.now()}`;

    return {
      name: defaultName,
      displayName: defaultName, // 用户可编辑的显示名称
      url: url,
      fontFamily: fontFamily,
      fontId: fontId,
      css: input, // 保存原始CSS
      tags: [],
      order: Date.now(), // 排序顺序
      addedAt: new Date().toISOString(),
      custom: {} // 用户自定义数据
    };
  }

  /**
   * 添加字体
   * @param {Object} fontData - 字体数据
   * @returns {boolean} 是否添加成功
   */
  async addFont(fontData) {
    // 如果是字符串，先解析
    if (typeof fontData === 'string') {
      fontData = this.parseFont(fontData);
      if (!fontData) return false;
    }

    // 检查重复
    if (this.fonts.has(fontData.name)) {
      console.warn('[FontManagerModule] 字体已存在:', fontData.name);
      return false;
    }

    // 添加到集合
    this.fonts.set(fontData.name, fontData);

    // 更新标签
    if (fontData.tags && fontData.tags.length > 0) {
      fontData.tags.forEach(tag => this.tags.add(tag));
    }

    // 保存
    await this.saveFonts();

    // 发布事件
    this.eventBus.emit('font:added', fontData);

    console.log('[FontManagerModule] 添加字体:', fontData.name);
    return true;
  }

  /**
   * 更新字体信息
   * @param {string} fontName - 原字体名称
   * @param {Object} updates - 更新的数据
   */
  async updateFont(fontName, updates) {
    const font = this.fonts.get(fontName);
    if (!font) return false;

    // 如果更改了名称，需要更新Map的key
    if (updates.name && updates.name !== fontName) {
      this.fonts.delete(fontName);
      this.fonts.set(updates.name, { ...font, ...updates });

      // 如果是当前字体，更新引用
      if (this.currentFont === fontName) {
        this.currentFont = updates.name;
        // 修复：同步保存currentFont
        await this.storage.set('currentFont', this.currentFont);
      }
    } else {
      this.fonts.set(fontName, { ...font, ...updates });
    }

    // 更新标签集合
    if (updates.tags) {
      this.updateTagsList();
      // 发布标签变化事件
      this.eventBus.emit('font:tagsChanged', { action: 'updated', font: fontName });
    }

    // 保存
    await this.saveFonts();

    // 发布事件
    this.eventBus.emit('font:updated', { oldName: fontName, font: this.fonts.get(updates.name || fontName) });

    return true;
  }

  /**
   * 删除字体
   * @param {string} fontName - 字体名称
   */
  async removeFont(fontName) {
    if (!this.fonts.has(fontName)) return false;

    const font = this.fonts.get(fontName);
    this.fonts.delete(fontName);

    // 如果删除的是当前字体，清除选择和应用的样式
    if (this.currentFont === fontName) {
      this.currentFont = null;
      // 修复：同步清除currentFont
      await this.storage.remove('currentFont');
      this.clearAppliedFont();
      this.eventBus.emit('font:changed', null);
    }

    // 更新标签列表
    this.updateTagsList();

    // 保存
    await this.saveFonts();

    // 发布事件
    this.eventBus.emit('font:removed', font);

    return true;
  }

  /**
   * 设置当前字体
   * 修改：2025-09-05 改进逻辑，即使字体功能禁用也保存用户选择
   * @param {string} fontName - 字体名称
   */
  async setCurrentFont(fontName) {
    if (!this.fonts.has(fontName)) {
      console.warn('[FontManagerModule] 字体不存在:', fontName);
      return false;
    }

    // 保存当前字体选择（无论字体功能是否启用）
    this.currentFont = fontName;

    // 修复：确保currentFont被单独保存到云端
    await this.storage.set('currentFont', fontName);

    // 同时在saveFonts中也会保存（双重保险）
    await this.saveFonts();

    // 只有在字体功能启用时才应用字体
    if (this.fontEnabled) {
      const font = this.fonts.get(fontName);
      if (font) {
        this.applyFont(font);
      }
    } else {
      console.log('[FontManagerModule] 字体功能已禁用，已保存选择但不应用字体:', fontName);
    }

    // 发布事件
    this.eventBus.emit('font:changed', fontName);

    return true;
  }

  /**
   * 获取当前字体
   */
  getCurrentFont() {
    return this.currentFont ? this.fonts.get(this.currentFont) : null;
  }

  /**
   * 获取字体
   * @param {string} fontName - 字体名称
   */
  getFont(fontName) {
    return this.fonts.get(fontName);
  }

  /**
   * 获取所有字体
   * @param {string} tag - 标签筛选（可选）
   */
  getAllFonts(tag = null) {
    const fontsArray = Array.from(this.fonts.values());

    // 标签筛选
    if (tag && tag !== 'all') {
      if (tag === 'untagged') { // 添加未分类筛选支持
        return fontsArray.filter(font =>
          !font.tags || font.tags.length === 0
        );
      }
      return fontsArray.filter(font =>
        font.tags && font.tags.includes(tag)
      );
    }

    return fontsArray;
  }

  /**
   * 按标签分组获取字体
   */
  getFontsByTags() {
    const grouped = {
      all: this.getAllFonts(),
      untagged: []
    };

    // 初始化标签组
    this.tags.forEach(tag => {
      grouped[tag] = [];
    });

    // 分组
    this.fonts.forEach(font => {
      if (!font.tags || font.tags.length === 0) {
        grouped.untagged.push(font);
      } else {
        font.tags.forEach(tag => {
          if (grouped[tag]) {
            grouped[tag].push(font);
          }
        });
      }
    });

    return grouped;
  }

  /**
   * 更新字体排序
   * @param {Array} sortedNames - 排序后的字体名称数组
   */
  async updateOrder(sortedNames) {
    sortedNames.forEach((name, index) => {
      const font = this.fonts.get(name);
      if (font) {
        font.order = index;
      }
    });

    await this.saveFonts();
    this.eventBus.emit('font:orderChanged', sortedNames);
  }

  /**
   * 导出字体配置
   * @returns {string} JSON字符串
   */
  exportFonts() {
    const exportData = {
      version: '2.0.3',
      exportDate: new Date().toISOString(),
      fonts: Array.from(this.fonts.values()),
      currentFont: this.currentFont,
      fontEnabled: this.fontEnabled,
      tags: Array.from(this.tags)
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导入字体配置
   * @param {string} jsonData - JSON数据
   * @param {boolean} merge - 是否合并（true）或替换（false）
   */
  async importFonts(jsonData, merge = true) {
    try {
      const data = JSON.parse(jsonData);

      if (!data.fonts || !Array.isArray(data.fonts)) {
        throw new Error('无效的导入数据格式');
      }

      // 如果不合并，先清空
      if (!merge) {
        this.fonts.clear();
        this.tags.clear();
      }

      // 导入字体
      let imported = 0;
      data.fonts.forEach(font => {
        // 如果合并模式且字体已存在，跳过
        if (merge && this.fonts.has(font.name)) {
          console.log('[FontManagerModule] 跳过已存在的字体:', font.name);
          return;
        }

        this.fonts.set(font.name, font);

        // 更新标签
        if (font.tags && font.tags.length > 0) {
          font.tags.forEach(tag => this.tags.add(tag));
        }

        imported++;
      });

      // 设置当前字体
      if (data.currentFont && this.fonts.has(data.currentFont)) {
        this.currentFont = data.currentFont;
        // 修复：确保导入后currentFont被保存
        await this.storage.set('currentFont', this.currentFont);
      }

      // 导入字体启用状态
      if (data.fontEnabled !== undefined) {
        this.fontEnabled = data.fontEnabled;
        await this.storage.set('fontEnabled', this.fontEnabled);
      }

      // 保存
      await this.saveFonts();

      // 发布事件
      this.eventBus.emit('font:imported', { count: imported, total: data.fonts.length });
      this.eventBus.emit('font:tagsChanged', { action: 'imported' });

      console.log(`[FontManagerModule] 导入完成，成功导入 ${imported}/${data.fonts.length} 个字体`);
      return imported;
    } catch (error) {
      console.error('[FontManagerModule] 导入失败:', error);
      throw error;
    }
  }

  /**
   * 批量添加字体
   * @param {Array} fontsData - 字体数据数组
   */
  async addFontsBatch(fontsData) {
    let added = 0;

    for (const fontData of fontsData) {
      if (await this.addFont(fontData)) {
        added++;
      }
    }

    return added;
  }

  /**
   * 更新标签列表
   */
  updateTagsList() {
    this.tags.clear();
    this.fonts.forEach(font => {
      if (font.tags && font.tags.length > 0) {
        font.tags.forEach(tag => this.tags.add(tag));
      }
    });

    // 发布标签变化事件
    this.eventBus.emit('font:tagsChanged', { action: 'refresh' });
  }

  /**
   * 保存字体到存储
   * 修改：2025-09-05 确保currentFont同时保存在fonts数据中
   */
  async saveFonts() {
    const data = {
      fonts: Array.from(this.fonts.entries()),
      tags: Array.from(this.tags),
      currentFont: this.currentFont  // 在fonts数据中也保存currentFont
    };

    await this.storage.set('fonts', data);

    // 修复：如果有currentFont，确保它也被单独保存（双重保险）
    if (this.currentFont) {
      await this.storage.set('currentFont', this.currentFont);
    }
  }

  /**
   * 从存储加载字体
   * 修改：2025-09-05 改进加载逻辑，处理currentFont
   */
  async loadFonts() {
    const data = await this.storage.get('fonts');

    if (data) {
      // 恢复字体Map
      if (data.fonts && Array.isArray(data.fonts)) {
        this.fonts = new Map(data.fonts);
      }

      // 恢复标签Set
      if (data.tags && Array.isArray(data.tags)) {
        this.tags = new Set(data.tags);
      }

      // 恢复当前字体（从fonts数据中）
      if (data.currentFont) {
        this.currentFont = data.currentFont;
      }
    }

    // 修复：尝试从单独的currentFont键读取（兼容性）
    const separateCurrentFont = await this.storage.get('currentFont');
    if (separateCurrentFont && this.fonts.has(separateCurrentFont)) {
      this.currentFont = separateCurrentFont;
    }
  }

  /**
   * 清理模块
   */
  cleanup() {
    this.clearAppliedFont();
  }

  /**
   * 销毁模块
   */
  destroy() {
    this.cleanup();

    // 销毁UI
    if (this.ui) {
      this.ui.destroy();
    }
  }

  /**
   * 获取标签页配置
   */
  getTabConfig() {
    return {
      id: this.moduleId,
      title: '字体管理',
      icon: 'fa-font',
      ui: FontManagerUI,
      order: 2
    };
  }

  /**
   * 获取模块统计信息
   */
  getStats() {
    return {
      fontCount: this.fonts.size,
      tagCount: this.tags.size,
      currentFont: this.currentFont,
      enabled: this.fontEnabled
    };
  }

  /**
   * 清除所有字体
   */
  async clearAllFonts() {
    this.fonts.clear();
    this.tags.clear();
    this.currentFont = null;

    // 清除应用的字体
    this.clearAppliedFont();

    // 清除存储
    await this.storage.remove('fonts');
    await this.storage.remove('currentFont');

    // 发布事件
    this.eventBus.emit('font:allCleared');

    console.log('[FontManagerModule] 已清除所有字体');
  }
}