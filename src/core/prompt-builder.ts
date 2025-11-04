import { Config, IconInfo } from "../types/index.js";

/**
 * Prompt构建器 - 统一管理AI分析的prompt生成逻辑
 */
export class PromptBuilder {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * 构建图标分析的prompt
   */
  buildIconAnalysisPrompt(iconInfo: IconInfo): string {
    const categoryDescriptions = this.getCategoryDescriptions();
    const fileNameHints = this.extractFileNameHints(iconInfo.filename);

    return `你是一个图标分类专家。请主要基于图标的视觉内容进行分析和分类。

可用分类（Categories）:
${categoryDescriptions}

分析要求：
1. **依据图标的视觉内容**进行分类，包括图标的形状、符号、设计元素等
2. 文件名有重要的元信息，请务必结合文件名和视觉内容做分类：${iconInfo.filename}（关键词: ${fileNameHints}）

重要：你必须只返回有效的 JSON 对象，不要有任何其他内容。不要解释，不要使用 markdown 代码块，只返回纯 JSON。

必需的 JSON 格式：
{
  "category": "从上述分类中选择一个",
  "tags": ["中文标签1", "中文标签2", "中文标签3"],
  "confidence": 0.95,
  "reasoning": "中文简短说明"
}

示例响应（针对一个首页图标）：
{
  "category": "navigation",
  "tags": ["首页", "主页", "房子", "导航"],
  "confidence": 0.95,
  "reasoning": "图标显示房子形状，典型的首页/主页导航图标"
}

规则：
1. 从上述列表中选择最合适的分类
2. 如果不确定，使用 "interface" 作为默认分类
3. 提供 3-5 个相关的中文标签（必须是中文）
4. 置信度应在 0.0 到 1.0 之间
5. 推理说明应简洁（一到两句话，必须使用中文），并说明主要基于图标内容还是参考了文件名
6. 输出必须只是有效的 JSON

现在请主要基于图标的视觉内容进行分析并只返回 JSON：`;
  }

  /**
   * 获取分类描述
   */
  private getCategoryDescriptions(): string {
    return Object.entries(this.config.categories)
      .map(([cat, subcats]) => `- ${cat}: ${subcats.join(", ")}`)
      .join("\n");
  }

  /**
   * 从文件名中提取关键词提示
   */
  private extractFileNameHints(filename: string): string {
    const fileNameWithoutExt = filename.replace(/\.svg$/i, "");
    const hints = fileNameWithoutExt
      .split(/[-_\s]+/)
      .filter((part) => part.length > 1)
      .join(", ");
    return hints;
  }

  /**
   * 获取可用的分类列表
   */
  getCategories(): string[] {
    return Object.keys(this.config.categories);
  }
}
