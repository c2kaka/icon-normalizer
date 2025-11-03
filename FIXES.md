# 修复说明文档

## 修复的问题

### 1. EOF 错误：POST "http://127.0.0.1:60879/completion": EOF

**问题原因**：
- Ollama 模型加载或处理图像时内存不足或超时
- 并发请求过多导致服务过载
- 没有适当的超时和重试机制

**修复措施**：

#### 1.1 添加超时控制
```typescript
// 使用 Promise.race 实现超时控制
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error(`请求超时 (${this.config.ai.timeout}ms)`));
  }, this.config.ai.timeout);
});

const response = await Promise.race([chatPromise, timeoutPromise]);
```

#### 1.2 实现重试机制
```typescript
// 最多重试 3 次，使用指数退避策略
private maxRetries: number = 3;
private retryDelay: number = 1000; // 初始 1 秒

// 在重试间增加延迟
this.retryDelay = Math.min(this.retryDelay * 1.5, 10000);
```

#### 1.3 优化并发控制
```typescript
// 降低默认并发数
maxConcurrent: parseInt(process.env.MAX_CONCURRENT || "1")

// 批次间增加延迟
await new Promise((resolve) => setTimeout(resolve, 2000));

// 请求间增加小延迟
await new Promise((resolve) => setTimeout(resolve, index * 200));
```

#### 1.4 增强错误处理
```typescript
// 识别 EOF 错误并提供详细的解决建议
if (error.message.includes("EOF") || 
    error.message.includes("connection reset") ||
    error.message.includes("socket hang up")) {
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
```

---

### 2. 模型返回非 JSON 格式

**问题原因**：
- Prompt 不够明确和强制性
- 模型倾向于返回自然语言解释
- 缺少系统角色约束
- 没有使用 Ollama 的 JSON 格式参数

**修复措施**：

#### 2.1 优化 Prompt（改用英文）
```typescript
private buildPrompt(iconInfo: IconInfo): string {
  return `You are an icon classification expert. Analyze the icon image and classify it based on the following categories.

IMPORTANT: You MUST respond ONLY with a valid JSON object, nothing else. No explanations, no markdown code blocks, just the raw JSON.

Required JSON format:
{
  "category": "one_of_the_categories_above",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.95,
  "reasoning": "brief explanation"
}

Example response for a home icon:
{
  "category": "navigation",
  "tags": ["home", "house", "main", "start"],
  "confidence": 0.95,
  "reasoning": "Clear house/home icon commonly used for navigation to homepage"
}

Rules:
1. Choose the most appropriate category from the list above
2. If unsure, use "interface" as the default category
3. Provide 3-5 relevant tags in English
4. Confidence should be between 0.0 and 1.0
5. Reasoning should be concise (one sentence)
6. Output MUST be valid JSON only

Now analyze this icon and respond with JSON only:`;
}
```

**为什么改用英文**：
- 大部分 AI 模型在英文上训练更充分
- 英文 Prompt 更容易被理解为 API 指令
- 减少文化差异导致的误解

#### 2.2 添加 System Message
```typescript
messages: [
  {
    role: "system",
    content: "You are a JSON-only API. You MUST respond with valid JSON only. Never use markdown, never add explanations, just pure JSON.",
  },
  {
    role: "user",
    content: prompt,
    images: [base64Image],
  },
]
```

#### 2.3 使用 JSON 格式参数
```typescript
const chatPromise = this.ollama.chat({
  model: this.config.ai.model || "minicpm-v:latest",
  messages: [...],
  options: {
    temperature: 0.2, // 降低温度提高一致性
    top_p: 0.9,
    num_predict: 300, // 减少长度避免过多解释
  },
  format: "json", // 强制 JSON 格式输出（Ollama 0.1.26+）
});
```

#### 2.4 增强 JSON 解析
```typescript
private parseAIResponse(content: string): AIResponse {
  // 1. 移除 markdown 标记
  cleanedContent = cleanedContent
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/^json\s*/gi, "")
    .trim();

  // 2. 提取 JSON 对象
  const jsonStartIndex = cleanedContent.indexOf("{");
  const jsonEndIndex = cleanedContent.lastIndexOf("}");
  
  // 3. 使用正则提取完整 JSON
  const jsonMatches = cleanedContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  
  // 4. 验证必需字段
  if (!parsed.category && !parsed.tags) {
    return this.extractStructuredData(content);
  }
  
  // 5. 返回标准化数据
  return {
    category: parsed.category || "interface",
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
    confidence: typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5,
    reasoning: parsed.reasoning || "Parsed from model response",
  };
}
```

#### 2.5 智能回退机制
```typescript
private extractStructuredData(content: string): AIResponse {
  // 1. 尝试从文本中提取分类信息
  // 2. 查找关键词和模式
  // 3. 如果找不到，使用默认值
  
  return {
    category: "interface", // 安全的默认类别
    tags: ["icon", "ui", "interface"], // 通用标签
    confidence: 0.3, // 低置信度表示这是回退方案
    reasoning: "Fallback classification due to non-JSON response",
  };
}
```

---

## 配置优化

### 修改前
```typescript
ai: {
  model: "minicpm-v:latest",
  maxConcurrent: 3,
  timeout: 30000,
}
```

### 修改后
```typescript
ai: {
  model: process.env.AI_MODEL || "llava:latest", // 更稳定的模型
  maxConcurrent: parseInt(process.env.MAX_CONCURRENT || "1"), // 降低并发
  timeout: parseInt(process.env.AI_TIMEOUT || "60000"), // 增加超时
}
```

**原因**：
- `llava` 模型比 `minicpm-v` 更稳定，JSON 输出更一致
- 并发数为 1 避免过载（用户可根据系统配置调整）
- 60 秒超时给模型足够的处理时间

---

## 测试建议

### 1. 测试 EOF 错误修复
```bash
# 使用默认配置（并发=1）
yarn run dev process ./sample-icons

# 如果成功，尝试增加并发
MAX_CONCURRENT=2 yarn run dev process ./sample-icons
```

### 2. 测试 JSON 解析
```bash
# 查看处理日志，确认 JSON 解析成功
yarn run dev process ./sample-icons 2>&1 | grep "JSON"

# 应该看到很少或没有 "No JSON found" 警告
```

### 3. 测试重试机制
```bash
# 在处理过程中，如果出现临时错误，应该能看到重试信息
# 类似：分析图标 xxx.svg 失败 (尝试 1/3)，1000ms 后重试...
```

---

## 关键改进总结

### 可靠性提升
✅ EOF 错误重试机制 - 自动恢复临时故障  
✅ 超时控制 - 避免无限等待  
✅ 指数退避 - 给服务恢复时间  
✅ 智能错误分类 - 区分可重试和不可重试错误  

### JSON 输出改进
✅ 强制性 Prompt（英文） - 更明确的指令  
✅ System Message - API 角色约束  
✅ format: "json" - Ollama 原生支持  
✅ 增强的解析逻辑 - 容错性更强  
✅ 智能回退机制 - 确保总能返回有效数据  

### 性能优化
✅ 降低并发数 - 防止服务过载  
✅ 批次间延迟 - 给服务恢复时间  
✅ 请求间延迟 - 避免瞬时压力  
✅ 降低温度 - 提高输出一致性  
✅ 减少 token - 避免冗长解释  

### 用户体验
✅ 详细的错误信息 - 包含原因和解决建议  
✅ 进度日志 - 实时显示处理状态  
✅ 成功/失败统计 - 清晰的结果总结  
✅ 环境变量配置 - 灵活调整参数  

---

## 下一步建议

### 短期
1. 测试修复效果
2. 根据实际情况调整配置
3. 收集用户反馈

### 中期
1. 添加单元测试
2. 实现更多 AI 提供商（Claude, Gemini）
3. 增加图标缓存机制

### 长期
1. 实现分布式处理
2. 支持自定义模型
3. 添加 Web UI

---

## 相关文档

- [故障排查指南](./docs/troubleshooting.md)
- [Ollama 使用指南](./docs/Ollama使用指南.md)
- [开发手册](./docs/开发手册.md)

