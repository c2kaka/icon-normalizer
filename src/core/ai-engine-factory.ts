import { AIAnalysisEngine } from "./ai-engine.js";
import { OllamaAnalysisEngine } from "./ollama-engine.js";
import { Config, AIResponse, IconInfo } from "../types/index.js";

// 通用AI引擎接口
interface IAIEngine {
  analyzeIcon(iconInfo: IconInfo): Promise<AIResponse>;
  batchAnalyze(icons: IconInfo[]): Promise<Map<string, AIResponse>>;
}

// AI引擎工厂
export class AIEngineFactory {
  static createEngine(config: Config): IAIEngine {
    switch (config.ai.provider) {
      case "ollama":
        return new OllamaAnalysisEngine(config);
      case "openai":
      default:
        return new AIAnalysisEngine(config);
    }
  }

  // 检查AI服务是否可用
  static async checkService(config: Config): Promise<{ available: boolean; message?: string }> {
    try {
      switch (config.ai.provider) {
        case "ollama":
          const ollamaEngine = new OllamaAnalysisEngine(config);
          const ollamaAvailable = await ollamaEngine.checkService();
          if (!ollamaAvailable) {
            return {
              available: false,
              message: `Ollama服务不可用。请确保Ollama已启动并运行在 ${config.ai.baseUrl || "http://localhost:11434"}`,
            };
          }
          
          // 检查推荐的模型是否可用
          const models = await ollamaEngine.getAvailableModels();
          const modelName = config.ai.model || "llava";
          if (!models.includes(modelName)) {
            return {
              available: false,
              message: `模型 ${modelName} 未找到。可用模型: ${models.join(", ")}。使用 'ollama pull ${modelName}' 下载模型。`,
            };
          }
          
          return { available: true };
          
        case "openai":
          if (!config.ai.apiKey) {
            return {
              available: false,
              message: "OpenAI API密钥未设置。请设置 OPENAI_API_KEY 环境变量。",
            };
          }
          return { available: true };
          
        default:
          return {
            available: false,
            message: `不支持的AI服务提供商: ${config.ai.provider}`,
          };
      }
    } catch (error) {
      return {
        available: false,
        message: `服务检查失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // 获取服务提供商的帮助信息
  static getProviderHelp(provider: string): string {
    switch (provider) {
      case "ollama":
        return `
Ollama 配置说明:

1. 安装 Ollama:
   - 访问 https://ollama.ai/download 下载并安装 Ollama
   - 或使用命令: curl -fsSL https://ollama.ai/install.sh | sh

2. 启动 Ollama 服务:
   - Ollama 通常会自动启动服务
   - 手动启动: ollama serve

3. 下载视觉模型:
   - ollama pull llava
   - 或: ollama pull llava:latest

4. 环境变量配置:
   export AI_PROVIDER=ollama
   export OLLAMA_BASE_URL=http://localhost:11434  # 可选，默认值

5. 验证安装:
   - 运行: ollama list
   - 或访问: http://localhost:11434/api/tags

支持的视觉模型: llava, llava:latest, bakllava, 等
        `;
      
      case "openai":
        return `
OpenAI 配置说明:

1. 获取 API 密钥:
   - 访问 https://platform.openai.com/api-keys
   - 登录并创建新的 API 密钥

2. 环境变量配置:
   export AI_PROVIDER=openai  # 可选，默认值
   export OPENAI_API_KEY=sk-your-api-key-here

3. 支持的模型:
   - gpt-4o (推荐)
   - gpt-4-vision-preview
   - gpt-4-turbo

4. 验证配置:
   - 确保有有效的网络连接
   - 确保API密钥有足够的权限
        `;
      
      default:
        return `
支持的AI服务提供商:

1. openai - OpenAI GPT-4 Vision
2. ollama - 本地Ollama服务

使用方法:
export AI_PROVIDER=openai    # 或 ollama
        `;
    }
  }
}