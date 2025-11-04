import OpenAI from "openai";
import { AIResponse, Config, IconInfo } from "../types/index.js";
import { convertSvgToPngBase64 } from "../utils/svg-converter.js";
import { PromptBuilder } from "./prompt-builder.js";

export class AIAnalysisEngine {
  private openai: OpenAI;
  private config: Config;
  private promptBuilder: PromptBuilder;

  constructor(config: Config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.ai.apiKey,
      baseURL: config.ai.baseUrl,
    });
    this.promptBuilder = new PromptBuilder(config);
  }

  async analyzeIcon(iconInfo: IconInfo): Promise<AIResponse> {
    const prompt = this.promptBuilder.buildIconAnalysisPrompt(iconInfo);

    console.log("prompt: ", prompt);

    try {
      console.log("config: ", this.config);

      // 将 SVG 转换为 PNG Base64（应用图像预处理）
      const preprocessConfig = this.config.imagePreprocess?.enabled
        ? {
            targetSize: this.config.imagePreprocess.targetSize,
            backgroundColor: this.config.imagePreprocess.backgroundColor,
            padding: this.config.imagePreprocess.padding,
            autoCrop: this.config.imagePreprocess.autoCrop,
            cropThreshold: this.config.imagePreprocess.cropThreshold,
          }
        : undefined;

      const targetSize = this.config.imagePreprocess?.enabled
        ? this.config.imagePreprocess.targetSize
        : 512;

      const pngBase64 = await convertSvgToPngBase64(
        iconInfo.content,
        targetSize,
        preprocessConfig
      );

      const response = await this.openai.chat.completions.create({
        model: this.config.ai.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${pngBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
        top_p: 0.9,
        stop: ["```json"],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      throw new Error(`AI analysis failed: ${error}`);
    }
  }

  private parseAIResponse(content: string): AIResponse {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
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
      console.error("Failed to parse AI response:", content);
      throw new Error(`Failed to parse AI response: ${error}`);
    }
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
              reasoning: `Analysis failed: ${error}`,
            },
          };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ id, result }) => {
        results.set(id, result);
      });
    }

    return results;
  }
}
