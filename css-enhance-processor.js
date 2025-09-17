/**
 * CSS处理器模块 - JavaScript提取和执行
 * 
 * 核心功能：从CSS中提取<script>标签内容并执行
 */

export class CssProcessor {
  constructor(coreEngine) {
    this.coreEngine = coreEngine;
  }

  /**
   * 处理CSS内容（仅提取JavaScript）
   * @param {string} content - 原始CSS内容
   * @returns {Object} 处理结果
   */
  process(content) {
    const result = {
      css: '',
      javascript: '',
      addCommands: [] // 保留空数组以兼容
    };

    if (!content) return result;

    // 仅提取JavaScript代码
    const jsExtracted = this.extractJavaScript(content);
    result.javascript = jsExtracted.javascript;
    result.css = jsExtracted.css;

    return result;
  }

  /**
   * 提取JavaScript代码
   * @param {string} content - 原始内容
   * @returns {Object} {css: string, javascript: string}
   */
  extractJavaScript(content) {
    let css = content;
    let javascript = '';

    // 匹配 <script> 标签
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(content)) !== null) {
      javascript += match[1] + '\n';
      css = css.replace(match[0], '');
    }

    return {
      css: css.trim(),
      javascript: javascript.trim()
    };
  }

  /**
   * 空方法，保持兼容性
   */
  processAddSyntax(css) {
    return {
      css: css,
      commands: []
    };
  }

  /**
   * 空方法，保持兼容性
   */
  executeAddCommands(commands) {
    // 不执行任何操作
  }

  /**
   * 验证CSS语法
   * @param {string} css - CSS内容
   * @returns {boolean} 是否有效
   */
  validateCSS(css) {
    try {
      // 创建临时样式元素测试
      const testStyle = document.createElement('style');
      testStyle.textContent = css;

      // 暂时添加到文档
      document.head.appendChild(testStyle);

      // 检查是否有规则
      const hasRules = testStyle.sheet && testStyle.sheet.cssRules.length > 0;

      // 移除测试元素
      document.head.removeChild(testStyle);

      return hasRules;
    } catch (e) {
      console.warn('[CssProcessor] CSS验证失败:', e.message);
      return false;
    }
  }

  /**
   * 优化CSS
   * @param {string} css - CSS内容
   * @returns {string} 优化后的CSS
   */
  optimizeCSS(css) {
    // 移除多余空格和换行
    let optimized = css
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
      .replace(/\s+/g, ' ') // 合并空格
      .replace(/\s*([{}:;,])\s*/g, '$1') // 移除符号周围空格
      .trim();

    return optimized;
  }

  /**
   * 添加CSS前缀
   * @param {string} css - CSS内容
   * @returns {string} 添加前缀后的CSS
   */
  addVendorPrefixes(css) {
    const prefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];
    const properties = [
      'animation',
      'transform',
      'transition',
      'box-shadow',
      'border-radius',
      'flex',
      'filter'
    ];

    let prefixed = css;

    properties.forEach(prop => {
      const regex = new RegExp(`(^|\\s|;)(${prop}:)`, 'gi');
      if (regex.test(css)) {
        prefixes.forEach(prefix => {
          const prefixedProp = prefix + prop;
          // 避免重复添加
          if (!css.includes(prefixedProp)) {
            prefixed = prefixed.replace(regex, `$1${prefixedProp}:$2`);
          }
        });
      }
    });

    return prefixed;
  }
}