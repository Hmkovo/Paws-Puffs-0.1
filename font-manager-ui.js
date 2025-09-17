/**
 * 字体管理UI模块 - 字体管理界面
 * 功能：字体列表显示、标签管理、导入导出
 * 
 * 修改记录：
 * - 2025-09-06: 从ui.js分离为独立模块
 * - 2025-09-05: 添加字体库折叠、标签管理器
 */

import { UIBase } from './ui-base.js';

export class FontManagerUI extends UIBase {
  constructor(module) {
    super(module);

    // UI状态
    this.uiState = {
      fontSearchQuery: '',
      fontFilterTag: 'all',
      fontSortBy: 'name', // name, date, custom
      fontViewMode: 'list', // list, grid
      fontAddExpanded: false, // 字体添加区域展开状态
      expandedFonts: new Set(), // 展开的字体项
      importMergeMode: true, // 导入模式：true=合并，false=覆盖
      tagManagerExpanded: false, // 标签管理区域展开状态
      fontListExpanded: true // 字体库展开状态
    };

    this.fontListElement = null;
  }

  /**
   * 渲染UI
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="enhanced-section font-manager-section">
        <!-- 字体功能开关 -->
        <div class="font-enable-section-compact">
          <label class="checkbox_label">
            <input type="checkbox" id="font-enabled" ${this.module.fontEnabled ? 'checked' : ''}>
            <span>启用字体功能</span>
            <span class="hint-inline">关闭后将使用系统默认字体设置</span>
          </label>
        </div>
        
        <!-- 字体添加区域（可折叠） -->
        <div class="font-add-section">
          <div class="font-add-header" id="font-add-toggle">
            <h4>+ 添加新字体</h4>
            <i class="fa fa-chevron-${this.uiState.fontAddExpanded ? 'up' : 'down'}" id="font-add-icon"></i>
          </div>
          <div class="font-add-content" id="font-add-content" style="${this.uiState.fontAddExpanded ? '' : 'display: none;'}">
            <textarea id="font-input" placeholder='支持多种格式：
1. 完整字体代码：
@import url("https://fontsapi.zeoseven.com/256/main/result.css");
body {
    font-family: "Huiwen-mincho";
}

2. 仅@import链接（需填写自定义名称）：
@import url("https://fontsapi.zeoseven.com/119/main/result.css");' rows="5"></textarea>
            <div class="font-add-controls">
              <input type="text" id="font-name-input" placeholder="自定义字体名称（某些格式必填）" class="text_pole">
              <button id="add-font-btn" class="menu_button compact-btn">
                + 添加
              </button>
            </div>
          </div>
        </div>
        
        <!-- 字体筛选工具栏 -->
        <div class="font-toolbar">
          <div class="toolbar-left">
            <input type="text" id="font-search" placeholder="搜索..." class="text_pole compact" value="${this.uiState.fontSearchQuery}">
            <select id="font-tag-filter" class="text_pole compact">
              <option value="all">所有标签</option>
              <option value="untagged">未分类</option>
            </select>
          </div>
          <div class="toolbar-right">
            <label class="checkbox_label compact-checkbox">
              <input type="checkbox" id="import-merge" ${this.uiState.importMergeMode ? 'checked' : ''}>
              <span>合并</span>
            </label>
            <button id="font-import-btn" class="menu_button compact icon-only" title="导入">
              <i class="fa fa-upload"></i>
            </button>
            <button id="font-export-btn" class="menu_button compact icon-only" title="导出">
              <i class="fa fa-download"></i>
            </button>
            <button id="font-clear-all-btn" class="menu_button compact icon-only danger" title="清空所有字体">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
        
        <!-- 字体库（可折叠） -->
        <div class="font-warehouse-section">
          <div class="font-warehouse-header" id="font-warehouse-toggle">
            <h4>˚₊·⸅ 字体小仓库 ⸅·₊˚</h4>
            <i class="fa fa-chevron-${this.uiState.fontListExpanded ? 'up' : 'down'}" id="font-warehouse-icon"></i>
          </div>
          <div class="font-warehouse-content" id="font-warehouse-content" style="${this.uiState.fontListExpanded ? '' : 'display: none;'}">
            <!-- 字体列表 -->
            <div class="font-list-container">
              <div id="font-list" class="font-list">
                <!-- 动态生成的字体项 -->
              </div>
              
              <!-- 空状态提示 -->
              <div class="font-empty-state" style="display: none;">
                <i class="fa fa-font fa-2x"></i>
                <p>还没有添加任何字体</p>
                <p class="hint">点击上方"添加新字体"开始使用</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 标签管理区域 -->
        <div class="tag-manager-section-compact">
          <div class="tag-manager-header" id="tag-manager-toggle">
            <h4><i class="fa fa-tags"></i> 标签管理</h4>
            <i class="fa fa-chevron-${this.uiState.tagManagerExpanded ? 'up' : 'down'}" id="tag-manager-icon"></i>
          </div>
          <div class="tag-manager-content-compact" id="tag-manager-content" style="${this.uiState.tagManagerExpanded ? '' : 'display: none;'}">
            <div id="tag-manager-list" class="tag-manager-list">
              <!-- 动态生成的标签列表 -->
            </div>
            <div class="tag-manager-empty" style="display: none;">
              <p class="hint">暂无标签</p>
            </div>
          </div>
        </div>
        
        <!-- 隐藏的文件输入 -->
        <input type="file" id="font-import-file" accept=".json" style="display: none;">
      </div>
    `;

    // 刷新字体列表
    this.refreshFontList();
    this.refreshTagManager();
    this.updateTagFilter();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 字体功能启用开关
    const fontEnabledCheckbox = this.$('#font-enabled');
    if (fontEnabledCheckbox) {
      this.addEventListener(fontEnabledCheckbox, 'change', async (e) => {
        await this.module.setFontEnabled(e.target.checked);
      });
    }

    // 折叠/展开添加字体区域
    const toggleBtn = this.$('#font-add-toggle');
    if (toggleBtn) {
      this.addEventListener(toggleBtn, 'click', () => {
        const content = this.$('#font-add-content');
        const icon = this.$('#font-add-icon');

        this.uiState.fontAddExpanded = !this.uiState.fontAddExpanded;
        content.style.display = this.uiState.fontAddExpanded ? 'block' : 'none';
        icon.className = `fa fa-chevron-${this.uiState.fontAddExpanded ? 'up' : 'down'}`;
      });
    }

    // 字体库折叠/展开
    const warehouseToggle = this.$('#font-warehouse-toggle');
    if (warehouseToggle) {
      this.addEventListener(warehouseToggle, 'click', () => {
        const content = this.$('#font-warehouse-content');
        const icon = this.$('#font-warehouse-icon');

        this.uiState.fontListExpanded = !this.uiState.fontListExpanded;
        content.style.display = this.uiState.fontListExpanded ? 'block' : 'none';
        icon.className = `fa fa-chevron-${this.uiState.fontListExpanded ? 'up' : 'down'}`;

        if (this.uiState.fontListExpanded) {
          this.refreshFontList();
        }
      });
    }

    // 标签管理器折叠/展开
    const tagManagerToggle = this.$('#tag-manager-toggle');
    if (tagManagerToggle) {
      this.addEventListener(tagManagerToggle, 'click', () => {
        const content = this.$('#tag-manager-content');
        const icon = this.$('#tag-manager-icon');

        this.uiState.tagManagerExpanded = !this.uiState.tagManagerExpanded;
        content.style.display = this.uiState.tagManagerExpanded ? 'block' : 'none';
        icon.className = `fa fa-chevron-${this.uiState.tagManagerExpanded ? 'up' : 'down'}`;

        if (this.uiState.tagManagerExpanded) {
          this.refreshTagManager();
        }
      });
    }

    // 添加字体按钮
    const addFontBtn = this.$('#add-font-btn');
    if (addFontBtn) {
      this.addEventListener(addFontBtn, 'click', () => this.handleAddFont());
    }

    // 搜索框
    const searchInput = this.$('#font-search');
    if (searchInput) {
      this.addEventListener(searchInput, 'input', (e) => {
        this.uiState.fontSearchQuery = e.target.value;
        this.refreshFontList();
      });
    }

    // 标签筛选
    const tagFilter = this.$('#font-tag-filter');
    if (tagFilter) {
      this.addEventListener(tagFilter, 'change', (e) => {
        this.uiState.fontFilterTag = e.target.value;
        this.refreshFontList();
      });
    }

    // 导入按钮
    const importBtn = this.$('#font-import-btn');
    const importFile = this.$('#font-import-file');
    if (importBtn && importFile) {
      this.addEventListener(importBtn, 'click', () => importFile.click());
      this.addEventListener(importFile, 'change', (e) => this.handleImportFile(e));
    }

    // 导出按钮
    const exportBtn = this.$('#font-export-btn');
    if (exportBtn) {
      this.addEventListener(exportBtn, 'click', () => this.handleExportFonts());
    }

    // 清空所有字体按钮
    const clearAllBtn = this.$('#font-clear-all-btn');
    if (clearAllBtn) {
      this.addEventListener(clearAllBtn, 'click', async () => {
        if (this.confirm('确定要清空所有字体吗？此操作不可恢复！')) {
          await this.module.clearAllFonts();
          this.refreshFontList();
          this.showMessage('已清空所有字体', 'success');
        }
      });
    }

    // 监听字体模块事件
    this.module.eventBus.on('font:added', () => this.refreshFontList());
    this.module.eventBus.on('font:removed', () => this.refreshFontList());
    this.module.eventBus.on('font:updated', () => this.refreshFontList());
    this.module.eventBus.on('font:tagsChanged', () => {
      this.refreshTagManager();
      this.updateTagFilter();
    });
  }

  /**
   * 处理添加字体
   */
  async handleAddFont() {
    const input = this.$('#font-input').value.trim();
    const customName = this.$('#font-name-input').value.trim();

    if (!input) {
      alert('请输入字体代码');
      return;
    }

    // 解析字体
    let fontData = null;

    // 检查是否只是@import语句
    if (input.includes('@import') && !input.includes('font-family')) {
      // 只有@import，需要自定义名称
      if (!customName) {
        alert('检测到仅包含@import链接，请输入自定义字体名称');
        return;
      }

      fontData = this.module.parseFont(input, customName);
      if (fontData) {
        // 生成完整CSS
        fontData.css = `${input}\nbody { font-family: "${customName}"; }`;
        fontData.fontFamily = customName;
      }
    } else {
      // 尝试原有的解析方法
      fontData = this.module.parseFont(input, customName);
    }

    if (!fontData) {
      alert('无法解析字体代码，请检查格式');
      return;
    }

    // 添加字体
    const success = await this.module.addFont(fontData);

    if (success) {
      // 清空输入
      this.$('#font-input').value = '';
      this.$('#font-name-input').value = '';

      // 自动设置为当前字体
      await this.module.setCurrentFont(fontData.name);

      // 刷新列表
      this.refreshFontList();

      this.showMessage('字体添加成功', 'success');
    } else {
      alert('字体添加失败，可能已存在同名字体');
    }
  }

  /**
   * 处理导入文件
   */
  async handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const mergeCheckbox = this.$('#import-merge');
    const merge = mergeCheckbox ? mergeCheckbox.checked : true;

    try {
      const text = await file.text();
      const count = await this.module.importFonts(text, merge);

      const modeText = merge ? '增加' : '覆盖';
      alert(`成功导入 ${count} 个字体（${modeText}模式）`);

      event.target.value = '';
      this.refreshFontList();
    } catch (error) {
      alert('导入失败: ' + error.message);
      event.target.value = '';
    }
  }

  /**
   * 处理导出字体
   */
  handleExportFonts() {
    const data = this.module.exportFonts();

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanced-css-fonts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showMessage('字体配置已导出', 'success');
  }

  /**
   * 刷新字体列表
   */
  refreshFontList() {
    const fontList = this.$('#font-list');
    const emptyState = this.$('.font-empty-state');

    if (!fontList) return;

    // 获取字体列表
    let fonts = this.module.getAllFonts(this.uiState.fontFilterTag);

    // 搜索过滤
    if (this.uiState.fontSearchQuery) {
      const query = this.uiState.fontSearchQuery.toLowerCase();
      fonts = fonts.filter(font =>
        font.name.toLowerCase().includes(query) ||
        font.displayName.toLowerCase().includes(query) ||
        (font.tags && font.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // 排序
    fonts.sort((a, b) => {
      switch (this.uiState.fontSortBy) {
        case 'name':
          return a.displayName.localeCompare(b.displayName);
        case 'date':
          return new Date(b.addedAt) - new Date(a.addedAt);
        case 'custom':
          return (a.order || 0) - (b.order || 0);
        default:
          return 0;
      }
    });

    // 当前字体置顶
    const currentFontName = this.module.currentFont;
    if (currentFontName) {
      const currentFontIndex = fonts.findIndex(font => font.name === currentFontName);
      if (currentFontIndex > 0) {
        const currentFont = fonts.splice(currentFontIndex, 1)[0];
        fonts.unshift(currentFont);
      }
    }

    // 显示空状态或字体列表
    if (fonts.length === 0) {
      fontList.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';

      // 渲染字体列表
      fontList.innerHTML = fonts.map(font => this.createFontItem(font)).join('');

      // 添加拖拽功能
      this.initDragAndDrop();

      // 绑定字体项事件
      this.bindFontItemEvents();
    }
  }

  /**
   * 创建字体项HTML
   */
  createFontItem(font) {
    const isCurrent = this.module.currentFont === font.name;
    const isExpanded = this.uiState.expandedFonts.has(font.name);

    const tagsHtml = font.tags && font.tags.length > 0
      ? font.tags.map(tag => `<span class="font-tag">${tag}</span>`).join('')
      : '<span class="font-tag-empty">无标签</span>';

    // 获取现有的所有标签
    const allTags = Array.from(this.module.tags);
    const tagCheckboxes = allTags.map(tag => `
      <label class="tag-checkbox">
        <input type="checkbox" value="${tag}" ${font.tags && font.tags.includes(tag) ? 'checked' : ''}>
        <span>${tag}</span>
      </label>
    `).join('');

    // 现有标签的删除列表
    const currentTagsList = font.tags && font.tags.length > 0
      ? font.tags.map(tag => `
        <div class="tag-item">
          <span>${tag}</span>
          <button class="remove-tag-btn" data-font="${font.name}" data-tag="${tag}">×</button>
        </div>
      `).join('')
      : '<div class="no-tags">暂无标签</div>';

    return `
      <div class="font-item ${isCurrent ? 'current' : ''} ${isExpanded ? 'expanded' : ''}" 
           data-font-name="${font.name}" 
           draggable="true">
        
        <!-- 字体主信息行 -->
        <div class="font-item-main">
          <div class="font-item-header" data-font="${font.name}">
            <i class="fa fa-chevron-${isExpanded ? 'up' : 'down'} expand-icon"></i>
            <span class="font-item-name">
              ${font.displayName || font.name}
              ${isCurrent ? ' <span class="current-badge">✔</span>' : ''}
            </span>
            <div class="font-item-tags">
              ${tagsHtml}
            </div>
          </div>
          
          <div class="font-item-actions">
            <button class="font-action-btn font-use-btn" data-font="${font.name}" title="使用">
              <i class="fa fa-check"></i>
            </button>
            <button class="font-action-btn font-edit-btn" data-font="${font.name}" title="编辑名称">
              <i class="fa fa-edit"></i>
            </button>
            <button class="font-action-btn font-delete-btn" data-font="${font.name}" title="删除">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
        
        <!-- 展开的编辑区域 -->
        <div class="font-item-details" style="display: ${isExpanded ? 'block' : 'none'};">
          <div class="tag-editor">
            <div class="tag-section">
              <h6>当前标签</h6>
              <div class="current-tags">
                ${currentTagsList}
              </div>
            </div>
            
            <div class="tag-section">
              <h6>添加标签</h6>
              <div class="tag-input-group">
                <input type="text" class="tag-new-input" placeholder="输入新标签" data-font="${font.name}">
                <button class="add-new-tag-btn" data-font="${font.name}">添加</button>
              </div>
              
              ${allTags.length > 0 ? `
                <div class="existing-tags">
                  ${tagCheckboxes}
                </div>
                <button class="apply-tags-btn" data-font="${font.name}">应用选中标签</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 绑定字体项事件
   */
  bindFontItemEvents() {
    // 折叠/展开字体详情
    this.$$('.font-item-header').forEach(header => {
      this.addEventListener(header, 'click', (e) => {
        const fontName = e.currentTarget.dataset.font;
        const fontItem = this.$(`.font-item[data-font-name="${fontName}"]`);
        const details = fontItem.querySelector('.font-item-details');
        const icon = fontItem.querySelector('.expand-icon');

        if (this.uiState.expandedFonts.has(fontName)) {
          this.uiState.expandedFonts.delete(fontName);
          details.style.display = 'none';
          fontItem.classList.remove('expanded');
          icon.className = 'fa fa-chevron-down expand-icon';
        } else {
          this.uiState.expandedFonts.add(fontName);
          details.style.display = 'block';
          fontItem.classList.add('expanded');
          icon.className = 'fa fa-chevron-up expand-icon';
        }
      });
    });

    // 使用字体
    this.$$('.font-use-btn').forEach(btn => {
      this.addEventListener(btn, 'click', async (e) => {
        e.stopPropagation();
        const fontName = e.currentTarget.dataset.font;
        await this.module.setCurrentFont(fontName);
        this.refreshFontList();
      });
    });

    // 编辑字体名称
    this.$$('.font-edit-btn').forEach(btn => {
      this.addEventListener(btn, 'click', (e) => {
        e.stopPropagation();
        const fontName = e.currentTarget.dataset.font;
        const font = this.module.getFont(fontName);
        if (!font) return;

        const newName = this.prompt('编辑字体名称:', font.displayName || font.name);
        if (newName && newName !== font.displayName) {
          this.module.updateFont(fontName, {
            displayName: newName
          });
          this.refreshFontList();
        }
      });
    });

    // 删除字体
    this.$$('.font-delete-btn').forEach(btn => {
      this.addEventListener(btn, 'click', async (e) => {
        e.stopPropagation();
        const fontName = e.currentTarget.dataset.font;
        if (this.confirm(`确定要删除字体 "${fontName}" 吗？`)) {
          await this.module.removeFont(fontName);
          this.refreshFontList();
        }
      });
    });

    // 删除单个标签
    this.$$('.remove-tag-btn').forEach(btn => {
      this.addEventListener(btn, 'click', async (e) => {
        const fontName = e.currentTarget.dataset.font;
        const tagToRemove = e.currentTarget.dataset.tag;
        const font = this.module.getFont(fontName);

        if (font && font.tags) {
          const updatedTags = font.tags.filter(tag => tag !== tagToRemove);
          await this.module.updateFont(fontName, {
            tags: updatedTags
          });

          // 保持展开状态
          this.uiState.expandedFonts.add(fontName);
          this.refreshFontList();
        }
      });
    });

    // 添加新标签
    this.$$('.add-new-tag-btn').forEach(btn => {
      this.addEventListener(btn, 'click', async (e) => {
        const fontName = e.currentTarget.dataset.font;
        const input = this.$(`.tag-new-input[data-font="${fontName}"]`);
        const newTag = input.value.trim();

        if (newTag) {
          const font = this.module.getFont(fontName);
          const updatedTags = [...new Set([...(font.tags || []), newTag])];

          await this.module.updateFont(fontName, {
            tags: updatedTags
          });

          input.value = '';
          // 保持展开状态
          this.uiState.expandedFonts.add(fontName);
          this.refreshFontList();
        }
      });
    });

    // 应用选中的标签
    this.$$('.apply-tags-btn').forEach(btn => {
      this.addEventListener(btn, 'click', async (e) => {
        const fontName = e.currentTarget.dataset.font;
        const fontItem = this.$(`.font-item[data-font-name="${fontName}"]`);
        const checkboxes = fontItem.querySelectorAll('.tag-checkbox input:checked');

        const selectedTags = Array.from(checkboxes).map(cb => cb.value);

        if (selectedTags.length > 0) {
          const font = this.module.getFont(fontName);
          const updatedTags = [...new Set([...(font.tags || []), ...selectedTags])];

          await this.module.updateFont(fontName, {
            tags: updatedTags
          });

          // 保持展开状态
          this.uiState.expandedFonts.add(fontName);
          this.refreshFontList();
        }
      });
    });

    // Enter键添加标签
    this.$$('.tag-new-input').forEach(input => {
      this.addEventListener(input, 'keypress', (e) => {
        if (e.key === 'Enter') {
          const fontName = e.currentTarget.dataset.font;
          const addBtn = this.$(`.add-new-tag-btn[data-font="${fontName}"]`);
          if (addBtn) addBtn.click();
        }
      });
    });
  }

  /**
   * 初始化拖拽排序
   */
  initDragAndDrop() {
    const fontItems = this.$$('.font-item');
    let draggedElement = null;

    fontItems.forEach(item => {
      // 拖拽开始
      this.addEventListener(item, 'dragstart', (e) => {
        draggedElement = e.currentTarget;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      // 拖拽结束
      this.addEventListener(item, 'dragend', (e) => {
        e.currentTarget.classList.remove('dragging');
      });

      // 拖拽经过
      this.addEventListener(item, 'dragover', (e) => {
        if (e.preventDefault) {
          e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';

        const afterElement = getDragAfterElement(item.parentNode, e.clientY);
        if (afterElement == null) {
          item.parentNode.appendChild(draggedElement);
        } else {
          item.parentNode.insertBefore(draggedElement, afterElement);
        }

        return false;
      });
    });

    // 获取拖拽后的位置
    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.font-item:not(.dragging)')];

      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
  }

  /**
   * 刷新标签管理器
   */
  refreshTagManager() {
    const tagManagerList = this.$('#tag-manager-list');
    const tagManagerEmpty = this.$('.tag-manager-empty');

    if (!tagManagerList) return;

    const tags = Array.from(this.module.tags);

    if (tags.length === 0) {
      tagManagerList.innerHTML = '';
      if (tagManagerEmpty) tagManagerEmpty.style.display = 'block';
    } else {
      if (tagManagerEmpty) tagManagerEmpty.style.display = 'none';

      // 统计每个标签的使用次数
      const tagUsage = {};
      tags.forEach(tag => {
        tagUsage[tag] = 0;
        this.module.fonts.forEach(font => {
          if (font.tags && font.tags.includes(tag)) {
            tagUsage[tag]++;
          }
        });
      });

      // 生成标签管理项
      tagManagerList.innerHTML = tags.map(tag => `
        <div class="tag-manager-item-compact">
          <div class="tag-info">
            <span class="tag-name">${tag}</span>
            <span class="tag-usage">${tagUsage[tag]} 个</span>
          </div>
          <button class="tag-delete-btn-compact" data-tag="${tag}" title="删除标签">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      `).join('');

      // 绑定删除标签事件
      this.$$('.tag-delete-btn-compact').forEach(btn => {
        this.addEventListener(btn, 'click', async (e) => {
          const tagToDelete = e.currentTarget.dataset.tag;
          if (this.confirm(`确定要删除标签 "${tagToDelete}" 吗？\n这将从所有字体中移除该标签。`)) {
            await this.module.deleteTag(tagToDelete);
            this.refreshTagManager();
            this.refreshFontList();
          }
        });
      });
    }
  }

  /**
   * 更新标签筛选器
   */
  updateTagFilter() {
    const filter = this.$('#font-tag-filter');
    if (!filter) return;

    const currentValue = filter.value;
    const tags = Array.from(this.module.tags);

    // 重建选项
    filter.innerHTML = `
      <option value="all">所有标签</option>
      <option value="untagged">未分类</option>
      ${tags.map(tag => `<option value="${tag}">${tag}</option>`).join('')}
    `;

    // 恢复选择
    filter.value = currentValue;
  }

  /**
   * 刷新UI
   */
  refresh() {
    this.refreshFontList();
    this.refreshTagManager();
    this.updateTagFilter();
  }
}