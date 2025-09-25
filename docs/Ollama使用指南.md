# Ollama 使用指南

## 🚀 快速开始

Icon Normalizer 现在支持使用 Ollama 作为本地 AI 服务提供商，让你可以在本地进行图标分类，无需依赖外部 API。

## 📋 系统要求

- **操作系统**: macOS, Linux, Windows (WSL2)
- **内存**: 至少 8GB RAM (推荐 16GB)
- **存储**: 至少 10GB 可用空间
- **网络**: 下载模型时需要网络连接

## 🛠️ 安装 Ollama

### 1. 下载安装 Ollama

**macOS:**
```bash
# 使用 Homebrew (推荐)
brew install ollama

# 或直接下载安装包
# 访问 https://ollama.ai/download
```

**Linux:**
```bash
# 使用官方安装脚本
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
```bash
# 下载并安装 Ollama for Windows
# 访问 https://ollama.ai/download
```

### 2. 启动 Ollama 服务

安装完成后，Ollama 会自动启动服务。你也可以手动启动：

```bash
ollama serve
```

### 3. 下载视觉模型

Icon Normalizer 需要支持图像分析的模型：

```bash
# 下载 LLaVA 模型 (推荐)
ollama pull llava

# 或下载其他视觉模型
ollama pull llava:latest
ollama pull bakllava
```

### 4. 验证安装

```bash
# 检查服务状态
ollama list

# 测试模型
ollama run llava "Describe this image"
```

## ⚙️ 配置 Icon Normalizer

### 方法一：使用环境变量

```bash
# 设置使用 Ollama
export AI_PROVIDER=ollama

# 可选：设置 Ollama 服务地址
export OLLAMA_BASE_URL=http://localhost:11434

# 可选：指定模型
export AI_MODEL=llava
```

### 方法二：使用命令行参数

```bash
# 使用 Ollama 处理图标
yarn run dev process ./sample-icons \
  --provider ollama \
  --model llava \
  --base-url http://localhost:11434
```

### 方法三：修改 .env 文件

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

在 `.env` 文件中设置：
```
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
AI_MODEL=llava
```

## 🎯 使用示例

### 基本使用

```bash
# 使用 Ollama 处理示例图标
yarn run dev process ./sample-icons --provider ollama
```

### 检查服务状态

```bash
# 检查 OpenAI 服务
yarn run dev check --provider openai

# 检查 Ollama 服务
yarn run dev check --provider ollama
```

### 使用不同的模型

```bash
# 使用 LLaVA 模型
yarn run dev process ./icons --provider ollama --model llava

# 使用 bakllava 模型
yarn run dev process ./icons --provider ollama --model bakllava
```

### 自定义服务地址

```bash
# 如果 Ollama 运行在不同的地址
yarn run dev process ./icons \
  --provider ollama \
  --base-url http://192.168.1.100:11434
```

## 🔧 故障排除

### 1. 连接错误

**错误**: `无法连接到Ollama服务`

**解决方案**:
```bash
# 检查 Ollama 是否正在运行
ps aux | grep ollama

# 手动启动 Ollama
ollama serve

# 检查端口是否被占用
lsof -i :11434
```

### 2. 模型未找到

**错误**: `模型 llava 未找到`

**解决方案**:
```bash
# 下载模型
ollama pull llava

# 查看可用模型
ollama list

# 删除并重新下载
ollama rm llava
ollama pull llava
```

### 3. 内存不足

**错误**: `内存不足` 或处理速度很慢

**解决方案**:
```bash
# 减少并发数
yarn run dev process ./icons --provider ollama --concurrent 1

# 使用更小的模型
yarn run dev process ./icons --provider ollama --model llava:7b

# 关闭其他占用内存的应用程序
```

### 4. 模型下载失败

**错误**: `网络连接失败` 或下载中断

**解决方案**:
```bash
# 检查网络连接
ping ollama.ai

# 设置代理 (如果需要)
export HTTP_PROXY=http://proxy:port
export HTTPS_PROXY=http://proxy:port

# 重试下载
ollama pull llava
```

## 📊 性能优化

### 1. 模型选择

不同模型的性能对比：

| 模型 | 大小 | 速度 | 准确性 | 适用场景 |
|------|------|------|--------|----------|
| llava | ~4GB | 中等 | 高 | 通用场景 |
| llava:7b | ~4GB | 快 | 中 | 快速处理 |
| bakllava | ~2GB | 很快 | 中 | 轻量级任务 |

### 2. 并发控制

```bash
# 根据系统配置调整并发数
# 低配置系统 (8GB RAM)
--concurrent 1

# 中等配置系统 (16GB RAM)
--concurrent 2

# 高配置系统 (32GB+ RAM)
--concurrent 3-4
```

### 3. 批量处理

```bash
# 分批处理大量图标
for dir in ./icons/*/; do
  yarn run dev process "$dir" --provider ollama --output "./processed/$(basename "$dir")"
  sleep 5  # 批次间暂停
done
```

## 🔄 从 OpenAI 迁移到 Ollama

### 1. 备份现有配置

```bash
# 备份当前的环境变量
cp .env .env.backup

# 备份处理结果
cp -r processed processed-backup
```

### 2. 切换到 Ollama

```bash
# 修改环境变量
export AI_PROVIDER=ollama
unset OPENAI_API_KEY

# 或编辑 .env 文件
```

### 3. 测试对比

```bash
# 使用相同的数据集进行测试
yarn run dev process ./test-icons --provider openai --output ./openai-results
yarn run dev process ./test-icons --provider ollama --output ./ollama-results

# 对比结果
diff -r ./openai-results ./ollama-results
```

## 🎨 高级配置

### 1. 自定义模型

如果你有自定义训练的模型，可以使用：

```bash
# 添加自定义模型
ollama create my-vision-model -f Modelfile

# 使用自定义模型
yarn run dev process ./icons --provider ollama --model my-vision-model
```

### 2. 模型参数调优

```bash
# 在代码中调整模型参数 (需要修改源码)
options: {
  temperature: 0.3,      // 降低随机性
  top_p: 0.9,           // 提高一致性
  max_tokens: 500,      // 限制响应长度
}
```

### 3. 多服务配置

你可以同时配置 OpenAI 和 Ollama，根据需要切换：

```bash
# 使用 OpenAI (需要网络)
yarn run dev process ./icons --provider openai

# 使用 Ollama (本地)
yarn run dev process ./icons --provider ollama
```

## 📚 常见问题

### Q: Ollama 和 OpenAI 哪个更好？

**A**: 
- **OpenAI**: 准确性更高，功能更全面，但需要付费和网络
- **Ollama**: 免费本地运行，隐私保护好，但需要硬件资源

### Q: 需要多强的硬件？

**A**: 
- **最低要求**: 8GB RAM, 4GB 存储空间
- **推荐配置**: 16GB RAM, 10GB 存储空间
- **最佳体验**: 32GB RAM, GPU 加速

### Q: 可以离线使用吗？

**A**: 是的！一旦下载了模型，Ollama 完全可以离线工作。

### Q: 支持中文吗？

**A**: 是的，LLaVA 等模型支持中文图标分类和标签生成。

---

现在你可以在本地使用 AI 进行图标分类了！🎉