# 故障排查指南

## 常见问题

### 1. EOF 错误：连接被意外关闭

**错误信息**：
```
POST predict: Post "http://127.0.0.1:60879/completion": EOF
```

**原因分析**：
1. **模型加载失败或内存不足** - Ollama 尝试加载模型时内存不足
2. **Ollama 服务不稳定** - 服务正在重启或崩溃
3. **请求超时** - 模型响应时间过长，连接被中断
4. **并发请求过多** - 同时发起太多请求导致服务过载

**解决方案**：

#### 方案 1：检查并重启 Ollama 服务
```bash
# 检查 Ollama 是否运行
ps aux | grep ollama

# 停止现有服务
pkill ollama

# 重新启动服务
ollama serve

# 验证服务状态
ollama list
```

#### 方案 2：降低并发数
```bash
# 使用环境变量设置
export MAX_CONCURRENT=1

# 或在命令行指定
yarn run dev process ./icons --concurrent 1
```

#### 方案 3：增加超时时间
```bash
# 设置更长的超时时间（60秒）
export AI_TIMEOUT=60000

# 或在 .env 文件中设置
AI_TIMEOUT=60000
```

#### 方案 4：使用更小的模型
```bash
# llava:7b 比完整版本更快
ollama pull llava:7b

# 使用较小的模型
export AI_MODEL=llava:7b
yarn run dev process ./icons
```

#### 方案 5：检查系统资源
```bash
# 检查内存使用
free -h  # Linux
vm_stat  # macOS

# 检查磁盘空间
df -h

# 关闭其他占用资源的程序
```

---

### 2. 模型返回非 JSON 格式

**错误信息**：
```
No JSON found in Ollama response, attempting to extract structured data
Raw response: 根据提供的图像，该图标似乎不符合任何特定的类别...
```

**原因分析**：
1. **模型未遵循 JSON 格式指令** - 某些模型不稳定或不理解指令
2. **Prompt 不够明确** - 提示词没有强制要求 JSON 输出
3. **模型版本问题** - 使用的模型版本不支持结构化输出
4. **图像识别失败** - 模型无法识别图标内容

**解决方案**：

#### 方案 1：使用推荐的模型
```bash
# llava 模型对 JSON 输出支持较好
ollama pull llava:latest

# 在 .env 中配置
AI_MODEL=llava:latest
```

#### 方案 2：优化后的代码已实现
我们已经做了以下优化：

1. **增强的 Prompt** - 使用英文和更明确的指令
2. **System Message** - 添加系统提示强制 JSON 输出
3. **format: "json"** - 使用 Ollama 的 JSON 格式参数
4. **智能回退** - 当无法解析 JSON 时，自动提取结构化数据
5. **降低温度** - temperature=0.2 提高输出一致性

#### 方案 3：验证模型版本
```bash
# 查看已安装的模型
ollama list

# 更新到最新版本
ollama pull llava:latest

# 删除旧版本（可选）
ollama rm llava:old-version
```

#### 方案 4：手动测试模型
```bash
# 测试模型是否能返回 JSON
ollama run llava "Return JSON only: {\"test\": true}"

# 如果模型始终返回自然语言，考虑换模型
ollama pull bakllava  # 另一个视觉模型
```

---

### 3. 连接被拒绝错误

**错误信息**：
```
无法连接到Ollama服务。请确保Ollama已启动并运行在 http://localhost:11434
```

**解决方案**：

```bash
# 1. 检查 Ollama 是否安装
which ollama

# 2. 启动 Ollama 服务
ollama serve

# 3. 验证服务可访问
curl http://localhost:11434/api/tags

# 4. 如果端口被占用，使用不同端口
OLLAMA_HOST=0.0.0.0:11435 ollama serve

# 5. 更新配置使用新端口
export OLLAMA_BASE_URL=http://localhost:11435
```

---

### 4. 模型未找到错误

**错误信息**：
```
模型 minicpm-v:latest 未找到。请使用 'ollama pull minicpm-v:latest' 命令下载模型。
```

**解决方案**：

```bash
# 1. 查看可用模型
ollama list

# 2. 下载推荐模型
ollama pull llava:latest

# 3. 或下载其他视觉模型
ollama pull bakllava
ollama pull llava:7b
ollama pull llava:13b

# 4. 配置使用已下载的模型
export AI_MODEL=llava:latest
```

---

## 最佳实践

### 推荐配置

创建或编辑 `.env` 文件：

```bash
# AI 服务提供商
AI_PROVIDER=ollama

# Ollama 服务地址
OLLAMA_BASE_URL=http://localhost:11434

# 推荐使用 llava 模型
AI_MODEL=llava:latest

# 并发数（根据系统配置调整）
MAX_CONCURRENT=1

# 超时时间（毫秒）
AI_TIMEOUT=60000
```

### 系统配置建议

#### 低配置系统（8GB RAM）
```bash
AI_MODEL=llava:7b
MAX_CONCURRENT=1
AI_TIMEOUT=60000
```

#### 中等配置系统（16GB RAM）
```bash
AI_MODEL=llava:latest
MAX_CONCURRENT=2
AI_TIMEOUT=45000
```

#### 高配置系统（32GB+ RAM）
```bash
AI_MODEL=llava:13b
MAX_CONCURRENT=3
AI_TIMEOUT=30000
```

---

## 性能优化

### 1. 批量处理优化

当前实现已包含：
- 分批处理，避免同时发起过多请求
- 批次间延迟 2 秒，让服务有恢复时间
- 请求间延迟 200ms，避免瞬时过载

### 2. 重试机制

代码已实现：
- 最多重试 3 次
- 指数退避策略（1s, 1.5s, 2.25s）
- 智能判断哪些错误需要重试

### 3. 错误恢复

- EOF 错误自动重试
- 超时错误自动重试
- 配置错误立即失败（不重试）
- 非 JSON 响应使用智能回退

---

## 监控和调试

### 启用详细日志

代码已包含详细的控制台输出：
- ✓ 成功的分析
- ✗ 失败的分析
- 批次进度
- 重试信息

### 查看 Ollama 日志

```bash
# macOS
tail -f ~/Library/Logs/Ollama/server.log

# Linux
journalctl -u ollama -f

# 或查看 Ollama 进程输出
ollama serve  # 直接运行，日志会打印到控制台
```

### 测试单个图标

```bash
# 使用小数据集测试
mkdir test-icons
cp sample-icons/home.svg test-icons/
yarn run dev process ./test-icons
```

---

## 获取帮助

如果问题仍未解决：

1. 检查 Ollama 版本：`ollama --version`（推荐 0.1.26+）
2. 检查模型列表：`ollama list`
3. 查看系统资源：`top` 或 `htop`
4. 查看详细错误日志
5. 在项目 Issue 中反馈问题

---

## 更新日志

### 2024-11-03 - 重大改进

1. **EOF 错误修复**
   - 增加超时控制
   - 实现重试机制
   - 优化并发控制
   - 增加批次间延迟

2. **JSON 解析增强**
   - 改进 Prompt（使用英文，更明确）
   - 添加 System Message
   - 使用 `format: "json"` 参数
   - 智能 JSON 提取和清理
   - 增强的回退机制

3. **配置优化**
   - 默认模型改为 llava:latest
   - 默认并发数降为 1
   - 超时时间增加到 60 秒
   - 温度降低到 0.2

