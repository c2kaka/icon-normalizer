import { Ollama } from "ollama";
import sharp from "sharp";
import { AIResponse, Config, IconInfo } from "../types/index.js";

export class OllamaAnalysisEngine {
  private ollama: Ollama;
  private config: Config;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1秒

  constructor(config: Config) {
    this.config = config;
    this.ollama = new Ollama({
      host: config.ai.baseUrl || "http://localhost:11434",
    });
  }

  /**
   * Convert SVG content to PNG buffer for vision model processing
   */
  private async convertSvgToPng(svgContent: string): Promise<Buffer> {
    try {
      // Create a buffer from the SVG content
      const svgBuffer = Buffer.from(svgContent, "utf8");

      // Convert SVG to PNG using sharp
      const pngBuffer = await sharp(svgBuffer)
        .png()
        .resize(256, 256) // Resize to a reasonable size for vision model
        .toBuffer();

      return pngBuffer;
    } catch (error) {
      throw new Error(
        `Failed to convert SVG to PNG: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 带重试机制的图标分析
   */
  async analyzeIcon(iconInfo: IconInfo): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.analyzeIconOnce(iconInfo);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是配置错误或连接错误，不重试
        if (
          lastError.message.includes("无法连接到Ollama服务") ||
          lastError.message.includes("未找到")
        ) {
          throw lastError;
        }

        // EOF 错误或超时错误，进行重试
        if (attempt < this.maxRetries - 1) {
          console.warn(
            `分析图标 ${iconInfo.filename} 失败 (尝试 ${attempt + 1}/${
              this.maxRetries
            })，${this.retryDelay}ms 后重试...`
          );
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
          // 指数退避
          this.retryDelay = Math.min(this.retryDelay * 1.5, 10000);
        }
      }
    }

    throw lastError || new Error("分析失败");
  }

  /**
   * 单次图标分析尝试
   */
  private async analyzeIconOnce(iconInfo: IconInfo): Promise<AIResponse> {
    const prompt = this.buildPrompt(iconInfo);

    try {
      // Convert SVG to PNG for better compatibility with vision models
      const pngBuffer = await this.convertSvgToPng(iconInfo.content);
      const base64Image = pngBuffer.toString("base64");

      // 使用 Promise.race 添加超时控制
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`请求超时 (${this.config.ai.timeout}ms)`));
        }, this.config.ai.timeout);
      });

      const chatPromise = this.ollama.chat({
        model: this.config.ai.model || "minicpm-v:latest",
        messages: [
          {
            role: "system",
            content:
              "你是一个只返回 JSON 的 API。你必须只返回有效的 JSON，不要使用 markdown，不要添加解释，只返回纯 JSON。tags 和 reasoning 字段必须使用中文。",
          },
          {
            role: "user",
            content: prompt,
            images: [base64Image],
          },
        ],
        options: {
          temperature: 0.2, // 降低温度以提高一致性
          top_p: 0.9,
          num_predict: 300, // 减少预测长度，避免模型生成过多解释
        },
        format: "json", // 强制 JSON 格式输出（Ollama 0.1.26+ 支持）
      });

      const response = (await Promise.race([
        chatPromise,
        timeoutPromise,
      ])) as any;

      const content = response.message.content;
      if (!content) {
        throw new Error("No response from Ollama");
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error("Ollama Analysis failed:", error);

      // 检查是否是连接错误
      if (
        error instanceof Error &&
        (error.message.includes("ECONNREFUSED") ||
          error.message.includes("connect ECONNREFUSED"))
      ) {
        throw new Error(
          `无法连接到Ollama服务。请确保Ollama已启动并运行在 ${
            this.config.ai.baseUrl || "http://localhost:11434"
          }`
        );
      }

      // 检查是否是 EOF 错误 (连接被意外关闭)
      if (
        error instanceof Error &&
        (error.message.includes("EOF") ||
          error.message.includes("connection reset") ||
          error.message.includes("socket hang up"))
      ) {
        throw new Error(
          `Ollama连接意外关闭。可能原因：\n` +
            `1. 模型加载失败或内存不足\n` +
            `2. Ollama服务不稳定或重启中\n` +
            `3. 请求超时或模型响应过慢\n` +
            `建议：\n` +
            `- 检查 Ollama 服务状态: ollama list\n` +
            `- 重启 Ollama 服务: ollama serve\n` +
            `- 使用更小的模型或减少并发数`
        );
      }

      // 检查是否是超时错误
      if (error instanceof Error && error.message.includes("超时")) {
        throw new Error(
          `请求超时。建议：\n` +
            `- 增加超时时间配置\n` +
            `- 使用更快的模型\n` +
            `- 减少并发请求数`
        );
      }

      // 检查是否是模型不存在
      if (
        error instanceof Error &&
        error.message.includes("model") &&
        error.message.includes("not found")
      ) {
        throw new Error(
          `模型 ${
            this.config.ai.model || "minicpm-v:latest"
          } 未找到。请使用 'ollama pull ${
            this.config.ai.model || "minicpm-v:latest"
          }' 命令下载模型。`
        );
      }

      throw new Error(
        `Ollama analysis failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private buildPrompt(iconInfo: IconInfo): string {
    const categories = Object.keys(this.config.categories);
    const categoryDescriptions = Object.entries(this.config.categories)
      .map(([cat, subcats]) => `- ${cat}: ${subcats.join(", ")}`)
      .join("\n");

    // 从文件名中提取有用的信息（移除扩展名和特殊字符）
    const fileNameWithoutExt = iconInfo.filename.replace(/\.svg$/i, "");
    const fileNameHints = fileNameWithoutExt
      .split(/[-_\s]+/)
      .filter((part) => part.length > 1)
      .join(", ");

    return `你是一个图标分类专家。请分析这个图标图像并基于以下类别进行分类。

可用分类（Categories）:
${categoryDescriptions}

【重要元信息】图标文件名: ${iconInfo.filename}
文件名关键词: ${fileNameHints}

注意：文件名通常包含了图标的核心语义信息，请充分利用文件名来辅助你的分析和分类决策。

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
  "reasoning": "清晰的房子/首页图标，通常用于导航到主页"
}

规则：
1. 从上述列表中选择最合适的分类
2. 如果不确定，使用 "interface" 作为默认分类
3. 提供 3-5 个相关的中文标签（必须是中文）
4. 置信度应在 0.0 到 1.0 之间
5. 推理说明应简洁（一到两句话，必须使用中文）
6. 输出必须只是有效的 JSON
7. 充分参考文件名信息来提高分类准确度

现在分析这个图标并只返回 JSON：`;
  }

  private parseAIResponse(content: string): AIResponse {
    try {
      // 清理响应内容
      let cleanedContent = content.trim();

      // 移除常见的markdown标记
      cleanedContent = cleanedContent
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .replace(/^json\s*/gi, "")
        .trim();

      // 移除可能的前导文本（如 "Here is the JSON:" 等）
      const jsonStartIndex = cleanedContent.indexOf("{");
      if (jsonStartIndex > 0) {
        cleanedContent = cleanedContent.substring(jsonStartIndex);
      }

      // 移除可能的尾随文本
      const jsonEndIndex = cleanedContent.lastIndexOf("}");
      if (jsonEndIndex !== -1 && jsonEndIndex < cleanedContent.length - 1) {
        cleanedContent = cleanedContent.substring(0, jsonEndIndex + 1);
      }

      // 尝试找到最后一个完整的JSON对象（处理多个JSON对象的情况）
      const jsonMatches = cleanedContent.match(
        /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
      );
      let jsonMatch = jsonMatches ? jsonMatches[jsonMatches.length - 1] : null;

      if (!jsonMatch) {
        console.warn(
          "No JSON found in Ollama response, attempting to extract structured data"
        );
        console.warn("Raw response:", content.substring(0, 500)); // 只显示前500字符

        // 如果仍然没有找到JSON，尝试从文本中提取信息
        return this.extractStructuredData(content);
      }

      // 尝试解析JSON
      const parsed = JSON.parse(jsonMatch);

      // 验证必需字段
      if (!parsed.category && !parsed.tags) {
        console.warn("Parsed JSON missing required fields, using fallback");
        return this.extractStructuredData(content);
      }

      return {
        category: parsed.category || "interface", // 默认使用 interface
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        confidence:
          typeof parsed.confidence === "number"
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0.5,
        reasoning: parsed.reasoning || "Parsed from model response",
      };
    } catch (error) {
      console.error("Failed to parse Ollama response");
      console.error(
        "Parse error:",
        error instanceof Error ? error.message : String(error)
      );
      console.error("Content preview:", content.substring(0, 200));

      // 如果JSON解析失败，尝试从文本中提取信息
      return this.extractStructuredData(content);
    }
  }

  private extractStructuredData(content: string): AIResponse {
    // 尝试从文本中提取分类信息
    const lines = content.split("\n");
    let category = "interface"; // 使用 interface 作为默认类别
    let confidence = 0.3; // 降低置信度，因为这是回退方案
    const tags: string[] = [];
    let reasoning = "";

    // 查找关键词和模式
    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // 查找分类
      const categoryMatch = line.match(/category[s]?\s*[:：]\s*([a-zA-Z_-]+)/i);
      if (categoryMatch && categoryMatch[1]) {
        category = categoryMatch[1].toLowerCase();
      }

      // 查找置信度
      const confidenceMatch = line.match(/confidence\s*[:：]\s*([0-9.]+)/i);
      if (confidenceMatch && confidenceMatch[1]) {
        confidence = parseFloat(confidenceMatch[1]);
        if (confidence > 1) confidence = confidence / 100; // 处理百分比
      }

      // 查找标签
      const tagsMatch = line.match(/tags?\s*[:：]\s*(.+)/i);
      if (tagsMatch && tagsMatch[1]) {
        const tagList = tagsMatch[1]
          .split(/[,\s，、]+/)
          .filter((tag) => tag.trim() && tag.length > 1);
        tags.push(...tagList);
      }

      // 查找推理
      if (
        lowerLine.includes("reason") ||
        lowerLine.includes("because") ||
        lowerLine.includes("说明") ||
        lowerLine.includes("理由")
      ) {
        reasoning += line + " ";
      }
    }

    // 如果没有找到明确的分类，尝试从内容和文件名中推断
    if (category === "interface") {
      const categories = Object.keys(this.config.categories);

      // 尝试从内容中找到类别关键词
      for (const cat of categories) {
        if (content.toLowerCase().includes(cat.toLowerCase())) {
          category = cat;
          confidence = 0.4;
          break;
        }
      }
    }

    // 如果标签为空，尝试从内容中提取可能的关键词
    if (tags.length === 0) {
      // 提取常见的图标相关词汇
      const iconKeywords = [
        "icon",
        "button",
        "navigation",
        "arrow",
        "home",
        "user",
        "search",
        "menu",
        "settings",
        "close",
        "check",
        "delete",
        "edit",
        "add",
        "图标",
        "按钮",
        "导航",
        "箭头",
        "主页",
        "用户",
        "搜索",
        "菜单",
      ];

      for (const keyword of iconKeywords) {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          tags.push(keyword);
          if (tags.length >= 3) break;
        }
      }
    }

    // 如果还是没有标签，使用通用标签
    if (tags.length === 0) {
      tags.push("icon", "ui", "interface");
    }

    // 构建推理说明
    if (!reasoning.trim()) {
      reasoning = `Fallback classification as '${category}' due to non-JSON response from model`;
    }

    return {
      category,
      tags: tags.slice(0, 5), // 限制标签数量
      confidence: Math.max(0.1, Math.min(1.0, confidence)), // 确保置信度在合理范围内
      reasoning: reasoning.trim(),
    };
  }

  async batchAnalyze(icons: IconInfo[]): Promise<Map<string, AIResponse>> {
    const results = new Map<string, AIResponse>();
    const batchSize = this.config.ai.maxConcurrent;

    console.log(`开始批量分析 ${icons.length} 个图标，并发数: ${batchSize}`);

    for (let i = 0; i < icons.length; i += batchSize) {
      const batch = icons.slice(i, i + batchSize);
      console.log(
        `处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          icons.length / batchSize
        )}...`
      );

      const promises = batch.map(async (icon, index) => {
        try {
          // 添加小延迟，避免同时启动所有请求
          await new Promise((resolve) => setTimeout(resolve, index * 200));

          const result = await this.analyzeIcon(icon);
          console.log(`✓ ${icon.filename} 分析完成`);
          return { id: icon.id, result };
        } catch (error) {
          console.error(
            `✗ ${icon.filename} 分析失败:`,
            error instanceof Error ? error.message : String(error)
          );
          return {
            id: icon.id,
            result: {
              category: "error",
              tags: [],
              confidence: 0,
              reasoning: `Analysis failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ id, result }) => {
        results.set(id, result);
      });

      // 在批次之间添加更长的延迟，让 Ollama 服务有时间恢复
      if (i + batchSize < icons.length) {
        console.log(`批次完成，等待 0.5 秒后继续...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(
      `批量分析完成，成功: ${
        Array.from(results.values()).filter((r) => r.category !== "error")
          .length
      }/${icons.length}`
    );
    return results;
  }

  // 检查Ollama服务是否可用
  async checkService(): Promise<boolean> {
    try {
      await this.ollama.list();
      return true;
    } catch (error) {
      console.error("Ollama service check failed:", error);
      return false;
    }
  }

  // 获取可用模型列表
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.ollama.list();
      return response.models.map((model) => model.name);
    } catch (error) {
      console.error(
        "Failed to get Ollama models:",
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }
}
