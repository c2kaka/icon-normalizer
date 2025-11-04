import { config } from "dotenv";
import { Config } from "../types/index.js";

// 强制覆盖已存在的环境变量，优先使用 .env 文件中的配置
config({ override: true });

export const defaultConfig: Config = {
  ai: {
    model:
      process.env.AI_PROVIDER === "openai"
        ? process.env.OPENAI_MODEL || "gpt-4o"
        : process.env.OLLAMA_MODEL || "minicpm-v:latest",
    // apiKey: process.env.OPENAI_API_KEY || "",
    apiKey:
      process.env.AI_PROVIDER === "openai"
        ? process.env.OPENAI_API_KEY || ""
        : "",
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_REQUESTS || "1"), // 降低默认并发数，防止 Ollama 过载
    timeout: parseInt(process.env.AI_TIMEOUT || "60000"), // 增加超时时间到 60 秒
    provider: (process.env.AI_PROVIDER as "openai" | "ollama") || "openai", // 默认使用OpenAI
    baseUrl: process.env.BASE_URL || "",
  },
  processing: {
    outputDir: "./processed",
    backup: true,
    similarityThreshold: 0.8,
  },
  categories: {
    interface: ["navigation", "actions", "controls", "input", "output"],
    media: ["play", "pause", "volume", "screen", "camera"],
    action: ["add", "remove", "edit", "save", "delete", "download", "upload"],
    alert: ["warning", "error", "info", "success", "notification"],
    avatar: ["user", "profile", "person", "people", "face"],
    communication: ["email", "phone", "message", "chat", "call"],
    content: ["text", "image", "video", "audio", "file"],
    device: ["computer", "mobile", "tablet", "tv", "watch"],
    editor: ["bold", "italic", "underline", "align", "list"],
    file: ["folder", "document", "archive", "attachment"],
    health: ["heart", "medical", "fitness", "food"],
    image: ["photo", "gallery", "filter", "crop"],
    location: ["map", "pin", "gps", "direction"],
    maps: ["map", "location", "navigation", "direction"],
    navigation: [
      "arrow",
      "home",
      "back",
      "forward",
      "up",
      "down",
      "left",
      "right",
    ],
    notification: ["bell", "alert", "message", "warning"],
    social: ["share", "like", "comment", "follow", "heart"],
    text: ["font", "size", "color", "format"],
    time: ["clock", "calendar", "date", "timer"],
    transportation: ["car", "bus", "train", "plane", "bike"],
    travel: ["map", "location", "hotel", "flight"],
    shopping: ["cart", "bag", "gift", "tag"],
    sports: ["ball", "trophy", "medal", "goal"],
    science: ["lab", "atom", "microscope", "telescope"],
    education: ["book", "graduation", "school", "pencil"],
    food: ["restaurant", "coffee", "pizza", "drink"],
    emoji: ["smile", "sad", "laugh", "cry", "heart"],
    flags: ["country", "language", "region"],
  },
};

export function loadConfig(configPath?: string): Config {
  if (configPath) {
    try {
      const configData = require(configPath);
      return { ...defaultConfig, ...configData };
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error);
    }
  }
  return defaultConfig;
}
