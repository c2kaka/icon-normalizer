# MVP Definition - icon-normalizer

**Version:** 1.0  
**Date:** September 25, 2024  
**Phase:** Minimum Viable Product  

---

## MVP Vision

**Core Purpose:** 创建一个简单的本地工具，能够自动分类和去重SVG图标库，解决手动分类成本高的问题。

**用户问题:** 前端项目有近1000个SVG文件，没有分类且有重复，人工分类成本高没人愿意做。

**MVP解决方案:** 基于AI的本地工具，自动处理图标分类和去重，将数周的手工工作缩短到几分钟。

---

## MVP Scope (核心功能)

### ✅ 包含的功能

#### 1. 核心AI分析引擎
- **SVG文件解析**: 读取和验证SVG文件
- **AI分类调用**: 使用OpenAI API进行图标分类
- **相似度检测**: 识别重复和相似图标
- **置信度评分**: 为每个分类结果提供置信度

#### 2. 本地处理流程
- **目录扫描**: 自动发现指定目录下的所有SVG文件
- **批量处理**: 一次性处理整个图标库
- **进度显示**: 显示处理进度和状态
- **结果报告**: 生成处理结果摘要

#### 3. 元数据嵌入
- **XML注释**: 在SVG文件中添加人类可读的分类信息
- **分类标签**: 添加类别和标签信息
- **处理时间戳**: 记录处理时间和工具版本
- **置信度信息**: 包含AI分类的置信度

#### 4. 去重功能
- **精确重复**: 检测完全相同的文件
- **相似重复**: 识别视觉上相似的图标
- **重复报告**: 生成重复文件清单
- **建议操作**: 提供保留/删除建议

#### 5. 简单命令行界面
- **基本命令**: 简单易用的CLI命令
- **配置选项**: 基本的配置参数
- **错误处理**: 友好的错误提示
- **帮助文档**: 清晰的使用说明

### ❌ 不包含的功能

#### 架构相关
- [ ] Docker容器化
- [ ] 微服务架构
- [ ] API服务器
- [ ] 数据库系统
- [ ] 缓存服务
- [ ] 消息队列

#### 界面相关
- [ ] Web管理界面
- [ ] 图形用户界面
- [ ] 可视化比较工具
- [ ] 拖拽上传功能
- [ ] 实时预览

#### 高级功能
- [ ] 实时处理
- [ ] 插件系统
- [ ] 多租户支持
- [ ] 用户管理
- [ ] 权限控制
- [ ] 审计日志

#### 集成相关
- [ ] Git hooks
- [ ] CI/CD集成
- [ ] IDE插件
- [ ] 设计工具集成
- [ ] 第三方API集成

#### 企业功能
- [ ] 企业安全
- [ ] 合规认证
- [ ] 技术支持
- [ ] 商业授权
- [ ] 云部署

---

## 技术架构 (简化版)

### 核心组件
```
icon-normalizer-mvp/
├── src/
│   ├── core/           # 核心分析引擎
│   ├── processor/      # 文件处理器
│   ├── cli/           # 命令行界面
│   └── utils/         # 工具函数
├── config/            # 配置文件
├── examples/          # 示例和测试
└── package.json       # 项目配置
```

### 数据流程
```
输入目录 → SVG扫描 → AI分析 → 分类去重 → 元数据嵌入 → 输出结果
```

### 技术选型
- **语言**: TypeScript (Node.js)
- **AI服务**: OpenAI API
- **文件处理**: Node.js fs模块
- **命令行**: Commander.js
- **配置**: JSON文件

---

## 核心功能详解

### 1. SVG分析引擎

#### 功能描述
```typescript
class IconAnalyzer {
  async analyzeIcon(svgContent: string): Promise<AnalysisResult> {
    // 1. 解析和验证SVG
    // 2. 转换为图像格式
    // 3. 调用AI进行分析
    // 4. 返回分类结果
  }
}
```

#### 输出格式
```typescript
interface AnalysisResult {
  id: string;
  category: string;        // 主分类 (如: "interface/navigation")
  confidence: number;       // 置信度 (0-1)
  tags: string[];          // 标签 (如: ["arrow", "left", "navigation"])
  duplicates: string[];    // 重复文件ID列表
  metadata: {
    processedAt: Date;     // 处理时间
    version: string;       // 工具版本
  };
}
```

### 2. 元数据嵌入

#### XML注释格式
```xml
<!-- Icon Analysis Metadata -->
<!-- Category: interface/navigation/arrows -->
<!-- Tags: arrow, left, back, navigation -->
<!-- Confidence: 0.92 -->
<!-- Processed: 2024-09-25T10:30:00Z -->
<!-- Version: icon-normalizer-mvp v1.0 -->
<svg xmlns="http://www.w3.org/2000/svg">
  <path d="M10 20 L5 15 L10 10" stroke="currentColor"/>
</svg>
```

#### 属性嵌入格式
```xml
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:iconmeta="http://icon-normalizer.dev/metadata"
     iconmeta:category="interface/navigation/arrows"
     iconmeta:tags="arrow,left,back,navigation"
     iconmeta:confidence="0.92">
  <!-- Icon Analysis Metadata -->
  <path d="M10 20 L5 15 L10 10" stroke="currentColor"/>
</svg>
```

### 3. 命令行界面

#### 基本命令
```bash
# 基本用法
icon-normalizer analyze ./icons

# 带配置文件
icon-normalizer analyze ./icons --config config.json

# 输出到指定目录
icon-normalizer analyze ./icons --output ./processed

# 仅分析不修改文件
icon-normalizer analyze ./icons --dry-run

# 显示详细信息
icon-normalizer analyze ./icons --verbose
```

#### 配置文件格式
```json
{
  "ai": {
    "model": "gpt-4-vision-preview",
    "apiKey": "your-api-key",
    "maxConcurrent": 3
  },
  "processing": {
    "outputDir": "./processed",
    "backup": true,
    "similarityThreshold": 0.8
  },
  "categories": {
    "interface": {
      "navigation": ["arrows", "menus", "buttons"],
      "actions": ["save", "delete", "edit"]
    }
  }
}
```

### 4. 去重检测

#### 检测策略
1. **精确重复**: 文件哈希比较
2. **视觉相似**: AI图像相似度分析
3. **结构相似**: SVG路径比较
4. **语义相似**: AI语义分析

#### 输出报告
```json
{
  "summary": {
    "totalIcons": 1000,
    "uniqueIcons": 750,
    "duplicates": 250,
    "processingTime": "8m 32s"
  },
  "duplicateGroups": [
    {
      "master": "arrow-left.svg",
      "duplicates": ["arrow-back.svg", "left-arrow.svg"],
      "similarity": 0.95,
      "recommendation": "keep arrow-left.svg"
    }
  ]
}
```

---

## 成功标准

### 技术指标
- [ ] 处理1000个SVG文件时间 < 15分钟
- [ ] 分类准确率 > 80%
- [ ] 重复检测率 > 85%
- [ ] 内存使用 < 1GB
- [ ] 不修改原始文件（可选备份）

### 用户体验
- [ ] 命令行简单易用
- [ ] 错误信息清晰友好
- [ ] 进度显示直观
- [ ] 结果报告详细
- [ ] 配置简单

### 功能完整性
- [ ] 完整的SVG处理流程
- [ ] 准确的AI分类
- [ ] 有效的去重检测
- [ ] 正确的元数据嵌入
- [ ] 可靠的备份机制

---

## 开发计划 (4周)

### 第1周: 核心引擎
- [ ] SVG解析和验证
- [ ] AI分析接口
- [ ] 基础分类算法
- [ ] 单元测试框架

### 第2周: 文件处理
- [ ] 目录扫描功能
- [ ] 批量处理逻辑
- [ ] 进度跟踪
- [ ] 错误处理

### 第3周: 去重功能
- [ ] 相似度检测算法
- [ ] 重复文件识别
- [ ] 去重报告生成
- [ ] 备份机制

### 第4周: CLI和集成
- [ ] 命令行界面
- [ ] 配置文件支持
- [ ] 集成测试
- [ ] 文档和示例

---

## 使用场景

### 场景1: 整理现有图标库
```bash
# 开发者有一个混乱的图标目录
cd my-project/src/assets/icons
ls # 显示1000个未分类的SVG文件

# 运行MVP工具
npx icon-normalizer analyze .

# 结果: 图标被分类并添加元数据
# 生成处理报告和去重建议
```

### 场景2: 检查新图标
```bash
# 设计师添加了新图标
npx icon-normalizer analyze ./new-icons --dry-run

# 查看分类结果，确认无误后
npx icon-normalizer analyze ./new-icons
```

### 场景3: 定期维护
```bash
# 定期运行去重检查
npx icon-normalizer dedupe ./icons

# 生成分类报告
npx icon-normalizer report ./icons
```

---

## 风险和依赖

### 主要风险
1. **AI API成本**: 大量调用可能产生费用
2. **分类准确度**: AI结果可能不准确
3. **文件兼容性**: 不同SVG格式可能有问题
4. **性能问题**: 处理大量文件可能较慢

### 外部依赖
- **OpenAI API**: 核心AI服务
- **Node.js 18+**: 运行环境
- **网络连接**: AI API调用需要网络

### 缓解措施
- **成本控制**: 设置调用限制和本地缓存
- **准确性提升**: 优化提示词和后处理逻辑
- **兼容性**: 支持多种SVG格式和容错处理
- **性能优化**: 并发处理和进度优化

---

## 下一步计划

### MVP验证后
1. **用户反馈**: 收集使用反馈
2. **功能增强**: 基于反馈添加功能
3. **性能优化**: 提升处理速度
4. **界面改进**: 添加简单的Web界面
5. **集成扩展**: Git hooks和IDE插件

### 长期规划
- 完整的产品化版本
- 企业功能和安全
- 云服务和API平台
- 社区和生态系统

---

**MVP核心理念**: 先解决核心问题，快速验证价值，然后基于用户反馈迭代改进。

*这个MVP定义专注于解决用户的核心痛点，避免过度工程化，确保快速交付可用的解决方案。*