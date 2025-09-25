import { Ollama } from "ollama";
import sharp from "sharp";
import { AIResponse, Config, IconInfo } from "../types/index.js";

export class OllamaAnalysisEngine {
  private ollama: Ollama;
  private config: Config;

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
      const svgBuffer = Buffer.from(svgContent, 'utf8');
      
      // Convert SVG to PNG using sharp
      const pngBuffer = await sharp(svgBuffer)
        .png()
        .resize(256, 256) // Resize to a reasonable size for vision model
        .toBuffer();
      
      return pngBuffer;
    } catch (error) {
      throw new Error(`Failed to convert SVG to PNG: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeIcon(iconInfo: IconInfo): Promise<AIResponse> {
    const prompt = this.buildPrompt(iconInfo);

    try {
      // Convert SVG to PNG for better compatibility with vision models
      const pngBuffer = await this.convertSvgToPng(iconInfo.content);
      const base64Image = pngBuffer.toString("base64");

      const response = await this.ollama.chat({
        model: this.config.ai.model || "minicpm-v:latest",
        messages: [
          {
            role: "user",
            content: prompt,
            images: [base64Image],
          },
        ],
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 500,
        },
      });

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

    return `分析这个SVG图标并根据以下类别进行分类：

类别和子类别：
${categoryDescriptions}

说明：
1. 从上面的列表中选择最合适的类别
2. 根据图标的外观和功能提供相关标签
3. 评估分类的置信度（0.0-1.0）
4. 简要说明分类理由

图标文件名：${iconInfo.filename}

请以JSON格式回复：
{
  "category": "chosen_category",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.95,
  "reasoning": "简要说明"
}`;
  }

  private parseAIResponse(content: string): AIResponse {
    try {
      // 尝试找到JSON块
      let jsonMatch = content.match(/\{[\s\S]*\}/);

      // 如果没有找到完整的JSON，尝试修复常见的问题
      if (!jsonMatch) {
        // 移除markdown代码块标记
        const cleanedContent = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      }

      if (!jsonMatch) {
        console.warn(
          "No JSON found in Ollama response, attempting to extract structured data"
        );
        console.warn("Raw response:", content);

        // 如果仍然没有找到JSON，尝试从文本中提取信息
        return this.extractStructuredData(content);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        category: parsed.category || "uncategorized",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        reasoning: parsed.reasoning || "",
      };
    } catch (error) {
      console.error("Failed to parse Ollama response:", content);
      console.error(
        "Parse error:",
        error instanceof Error ? error.message : String(error)
      );

      // 如果JSON解析失败，尝试从文本中提取信息
      return this.extractStructuredData(content);
    }
  }

  private extractStructuredData(content: string): AIResponse {
    // 尝试从文本中提取分类信息
    const lines = content.split("\n");
    let category = "uncategorized";
    let confidence = 0.5;
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
          .filter((tag) => tag.trim());
        tags.push(...tagList);
      }

      // 查找推理
      if (
        lowerLine.includes("reason") ||
        lowerLine.includes("because") ||
        lowerLine.includes("because")
      ) {
        reasoning += line + "\n";
      }
    }

    // 如果没有找到明确的分类，尝试从内容中推断
    if (category === "uncategorized") {
      const categories = Object.keys(this.config.categories);
      for (const cat of categories) {
        if (content.toLowerCase().includes(cat.toLowerCase())) {
          category = cat;
          break;
        }
      }
    }

    return {
      category,
      tags: tags.slice(0, 5), // 限制标签数量
      confidence: Math.max(0.1, Math.min(1.0, confidence)), // 确保置信度在合理范围内
      reasoning: reasoning.trim() || "Extracted from text response",
    };
  }

  async batchAnalyze(icons: IconInfo[]): Promise<Map<string, AIResponse>> {
    const results = new Map<string, AIResponse>();
    const batchSize = this.config.ai.maxConcurrent;

    for (let i = 0; i < icons.length; i += batchSize) {
      const batch = icons.slice(i, i + batchSize);
      const promises = batch.map(async (icon) => {
        try {
          const result = await this.analyzeIcon(icon);
          return { id: icon.id, result };
        } catch (error) {
          console.error(`Failed to analyze icon ${icon.filename}:`, error);
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

      // 在批次之间添加小延迟，避免过快请求
      if (i + batchSize < icons.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

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
