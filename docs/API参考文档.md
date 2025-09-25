# Icon Normalizer API 参考文档

## 目录
- [核心类 API](#核心类-api)
- [工具类 API](#工具类-api)
- [类型定义](#类型定义)
- [使用示例](#使用示例)
- [错误处理](#错误处理)

## 核心类 API

### IconProcessor

主业务协调器，负责协调整个图标处理流程。

#### 构造函数

```typescript
constructor(options?: ProcessingOptions)
```

**参数**:
- `options`: 可选的处理选项

**示例**:
```typescript
const processor = new IconProcessor({
  outputDir: './processed',
  backup: true,
  similarityThreshold: 0.8
});
```

#### processDirectory

处理指定目录中的所有SVG图标。

```typescript
async processDirectory(inputDir: string): Promise<ProcessingResult>
```

**参数**:
- `inputDir`: 输入目录路径

**返回值**:
- `Promise<ProcessingResult>`: 处理结果对象

**异常**:
- `Error`: 当目录不存在、权限不足或处理失败时抛出

**示例**:
```typescript
try {
  const result = await processor.processDirectory('./icons');
  console.log(`处理完成: ${result.processedIcons}/${result.totalIcons}`);
} catch (error) {
  console.error('处理失败:', error);
}
```

---

### AIAnalysisEngine

AI分析引擎，负责与OpenAI API交互进行图标分类。

#### 构造函数

```typescript
constructor(config: Config)
```

**参数**:
- `config`: 配置对象，包含AI模型设置

**示例**:
```typescript
const engine = new AIAnalysisEngine(defaultConfig);
```

#### analyzeIcon

分析单个图标。

```typescript
async analyzeIcon(iconInfo: IconInfo): Promise<AIResponse>
```

**参数**:
- `iconInfo`: 图标信息对象

**返回值**:
- `Promise<AIResponse>`: AI分析结果

**异常**:
- `Error`: 当API调用失败或响应解析失败时抛出

**示例**:
```typescript
const iconInfo = {
  id: 'icon-123',
  filename: 'arrow.svg',
  content: '<svg>...</svg>',
  size: 1024,
  hash: 'abc123'
};

const result = await engine.analyzeIcon(iconInfo);
console.log(`分类: ${result.category}, 置信度: ${result.confidence}`);
```

#### batchAnalyze

批量分析多个图标。

```typescript
async batchAnalyze(icons: IconInfo[]): Promise<Map<string, AIResponse>>
```

**参数**:
- `icons`: 图标信息数组

**返回值**:
- `Promise<Map<string, AIResponse>>`: 图标ID到分析结果的映射

**异常**:
- `Error`: 当批量处理失败时抛出

**示例**:
```typescript
const results = await engine.batchAnalyze(icons);
results.forEach((result, iconId) => {
  console.log(`${iconId}: ${result.category}`);
});
```

---

### DuplicateDetector

重复图标检测器。

#### 构造函数

```typescript
constructor(options?: ProcessingOptions)
```

**参数**:
- `options`: 可选的处理选项

**示例**:
```typescript
const detector = new DuplicateDetector({
  similarityThreshold: 0.8
});
```

#### findDuplicates

查找重复图标。

```typescript
async findDuplicates(icons: IconInfo[]): Promise<DuplicateGroup[]>
```

**参数**:
- `icons`: 图标信息数组

**返回值**:
- `Promise<DuplicateGroup[]>`: 重复组数组

**示例**:
```typescript
const duplicates = await detector.findDuplicates(icons);
duplicates.forEach(group => {
  console.log(`主文件: ${group.master.filename}`);
  console.log(`重复项: ${group.duplicates.length}个`);
});
```

#### generateReport

生成重复检测报告。

```typescript
generateReport(groups: DuplicateGroup[]): string
```

**参数**:
- `groups`: 重复组数组

**返回值**:
- `string`: 格式化的报告文本

**示例**:
```typescript
const report = detector.generateReport(duplicates);
console.log(report);
```

## 工具类 API

### FileUtils

文件系统操作工具类。

#### scanDirectory

扫描目录中的SVG文件。

```typescript
static async scanDirectory(dirPath: string, recursive: boolean = true): Promise<string[]>
```

**参数**:
- `dirPath`: 目录路径
- `recursive`: 是否递归扫描子目录

**返回值**:
- `Promise<string[]>`: SVG文件路径数组

**示例**:
```typescript
const files = await FileUtils.scanDirectory('./icons', true);
console.log(`找到 ${files.length} 个SVG文件`);
```

#### getFileHash

计算文件内容的SHA256哈希值。

```typescript
static async getFileHash(filePath: string): Promise<string>
```

**参数**:
- `filePath`: 文件路径

**返回值**:
- `Promise<string>`: 哈希字符串

**示例**:
```typescript
const hash = await FileUtils.getFileHash('./icon.svg');
console.log(`文件哈希: ${hash}`);
```

#### getFileSize

获取文件大小。

```typescript
static async getFileSize(filePath: string): Promise<number>
```

**参数**:
- `filePath`: 文件路径

**返回值**:
- `Promise<number>`: 文件大小（字节）

**示例**:
```typescript
const size = await FileUtils.getFileSize('./icon.svg');
console.log(`文件大小: ${size} 字节`);
```

#### ensureDir

确保目录存在，如果不存在则创建。

```typescript
static async ensureDir(dirPath: string): Promise<void>
```

**参数**:
- `dirPath`: 目录路径

**示例**:
```typescript
await FileUtils.ensureDir('./output/categories');
```

#### copyFile

复制文件。

```typescript
static async copyFile(src: string, dest: string): Promise<void>
```

**参数**:
- `src`: 源文件路径
- `dest`: 目标文件路径

**示例**:
```typescript
await FileUtils.copyFile('./source.svg', './backup/source.svg');
```

#### writeFile

写入文件内容。

```typescript
static async writeFile(filePath: string, content: string): Promise<void>
```

**参数**:
- `filePath`: 文件路径
- `content`: 文件内容

**示例**:
```typescript
await FileUtils.writeFile('./output.svg', svgContent);
```

#### readFile

读取文件内容。

```typescript
static async readFile(filePath: string): Promise<string>
```

**参数**:
- `filePath`: 文件路径

**返回值**:
- `Promise<string>`: 文件内容

**示例**:
```typescript
const content = await FileUtils.readFile('./icon.svg');
console.log(content);
```

#### fileExists

检查文件是否存在。

```typescript
static async fileExists(filePath: string): Promise<boolean>
```

**参数**:
- `filePath`: 文件路径

**返回值**:
- `Promise<boolean>`: 文件是否存在

**示例**:
```typescript
const exists = await FileUtils.fileExists('./icon.svg');
console.log(exists ? '文件存在' : '文件不存在');
```

---

### SVGUtils

SVG文件处理工具类。

#### parseSVG

解析SVG内容。

```typescript
static async parseSVG(content: string): Promise<any>
```

**参数**:
- `content`: SVG内容字符串

**返回值**:
- `Promise<any>`: 解析后的SVG对象

**示例**:
```typescript
const parsed = await SVGUtils.parseSVG(svgContent);
console.log(parsed.svg);
```

#### validateSVG

验证SVG格式。

```typescript
static async validateSVG(content: string): Promise<boolean>
```

**参数**:
- `content`: SVG内容字符串

**返回值**:
- `Promise<boolean>`: 是否为有效SVG

**示例**:
```typescript
const isValid = await SVGUtils.validateSVG(content);
if (!isValid) {
  console.log('无效的SVG格式');
}
```

#### extractSVGInfo

提取SVG基本信息。

```typescript
static async extractSVGInfo(content: string): Promise<Partial<IconInfo>>
```

**参数**:
- `content`: SVG内容字符串

**返回值**:
- `Promise<Partial<IconInfo>>`: 部分图标信息

**示例**:
```typescript
const info = await SVGUtils.extractSVGInfo(content);
console.log('提取的信息:', info);
```

#### embedMetadata

嵌入元数据到SVG文件。

```typescript
static embedMetadata(content: string, metadata: {
  category: string;
  tags: string[];
  confidence: number;
  processedAt: Date;
  version: string;
}): string
```

**参数**:
- `content`: SVG内容字符串
- `metadata`: 元数据对象

**返回值**:
- `string`: 带元数据的SVG内容

**示例**:
```typescript
const metadata = {
  category: 'navigation',
  tags: ['arrow', 'right'],
  confidence: 0.95,
  processedAt: new Date(),
  version: '1.0.0'
};

const svgWithMetadata = SVGUtils.embedMetadata(svgContent, metadata);
```

#### extractMetadata

从SVG中提取元数据。

```typescript
static extractMetadata(content: string): {
  category?: string;
  tags?: string[];
  confidence?: number;
  processedAt?: Date;
  version?: string;
}
```

**参数**:
- `content`: SVG内容字符串

**返回值**:
- 包含提取的元数据的对象

**示例**:
```typescript
const metadata = SVGUtils.extractMetadata(svgContent);
if (metadata.category) {
  console.log(`分类: ${metadata.category}`);
}
```

---

### CryptoUtils

加密和哈希工具类。

#### generateId

基于内容生成唯一ID。

```typescript
static generateId(content: string): string
```

**参数**:
- `content`: 内容字符串

**返回值**:
- `string`: 16位哈希ID

**示例**:
```typescript
const id = CryptoUtils.generateId(svgContent);
console.log(`生成ID: ${id}`);
```

#### calculateSimilarity

计算两个哈希值的相似度。

```typescript
static calculateSimilarity(hash1: string, hash2: string): number
```

**参数**:
- `hash1`: 第一个哈希值
- `hash2`: 第二个哈希值

**返回值**:
- `number`: 相似度（0-1）

**示例**:
```typescript
const similarity = CryptoUtils.calculateSimilarity(hash1, hash2);
console.log(`相似度: ${(similarity * 100).toFixed(1)}%`);
```

#### generateIconId

生成图标唯一ID。

```typescript
static generateIconId(filename: string, content: string): string
```

**参数**:
- `filename`: 文件名
- `content`: 文件内容

**返回值**:
- `string`: 图标唯一ID

**示例**:
```typescript
const iconId = CryptoUtils.generateIconId('arrow.svg', svgContent);
console.log(`图标ID: ${iconId}`);
```

## 类型定义

### ProcessingOptions

处理选项接口。

```typescript
interface ProcessingOptions {
  outputDir?: string;           // 输出目录
  dryRun?: boolean;            // 预览模式
  backup?: boolean;            // 是否备份
  similarityThreshold?: number; // 相似度阈值
  maxConcurrent?: number;      // 最大并发数
  verbose?: boolean;           // 详细输出
}
```

### ProcessingResult

处理结果接口。

```typescript
interface ProcessingResult {
  totalIcons: number;          // 总图标数
  processedIcons: number;      // 已处理图标数
  duplicates: DuplicateGroup[]; // 重复组
  processingTime: number;      // 处理时间（毫秒）
  errors: string[];           // 错误列表
}
```

### IconInfo

图标信息接口。

```typescript
interface IconInfo {
  id: string;         // 唯一ID
  filename: string;   // 文件名
  path: string;       // 文件路径
  content: string;    // SVG内容
  size: number;       // 文件大小
  hash: string;       // 内容哈希
}
```

### DuplicateGroup

重复组接口。

```typescript
interface DuplicateGroup {
  master: IconInfo;                              // 主文件
  duplicates: IconInfo[];                        // 重复文件
  similarity: number;                            // 相似度
  recommendation: 'keep' | 'remove' | 'review'; // 建议
}
```

### AIResponse

AI响应接口。

```typescript
interface AIResponse {
  category: string;    // 分类
  tags: string[];     // 标签
  confidence: number;  // 置信度
  reasoning?: string;  // 推理说明
}
```

### Config

配置接口。

```typescript
interface Config {
  ai: {
    model: string;           // AI模型
    apiKey: string;          // API密钥
    maxConcurrent: number;   // 最大并发数
    timeout: number;         // 超时时间
  };
  processing: {
    outputDir: string;       // 输出目录
    backup: boolean;         // 是否备份
    similarityThreshold: number; // 相似度阈值
  };
  categories: Record<string, string[]>; // 分类映射
}
```

## 使用示例

### 基本使用

```typescript
import { IconProcessor } from './src/processor/icon-processor';
import { FileUtils } from './src/utils/file-utils';
import { defaultConfig } from './src/config';

async function main() {
  // 设置配置
  const config = {
    ...defaultConfig,
    ai: {
      ...defaultConfig.ai,
      apiKey: process.env.OPENAI_API_KEY
    }
  };

  // 创建处理器
  const processor = new IconProcessor({
    outputDir: './processed',
    backup: true,
    similarityThreshold: 0.8,
    verbose: true
  });

  try {
    // 处理目录
    const result = await processor.processDirectory('./icons');
    
    // 显示结果
    console.log('处理完成!');
    console.log(`总图标数: ${result.totalIcons}`);
    console.log(`已处理: ${result.processedIcons}`);
    console.log(`重复组: ${result.duplicates.length}`);
    console.log(`处理时间: ${(result.processingTime / 1000).toFixed(2)}秒`);
    
    if (result.errors.length > 0) {
      console.log('错误:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
  } catch (error) {
    console.error('处理失败:', error);
  }
}

main();
```

### 高级使用

```typescript
import { AIAnalysisEngine } from './src/core/ai-engine';
import { DuplicateDetector } from './src/core/duplicate-detector';
import { FileUtils, SVGUtils, CryptoUtils } from './src/utils';

async function advancedExample() {
  // 1. 扫描文件
  const files = await FileUtils.scanDirectory('./icons');
  
  // 2. 加载图标信息
  const icons = [];
  for (const file of files) {
    const content = await FileUtils.readFile(file);
    const size = await FileUtils.getFileSize(file);
    const hash = await FileUtils.getFileHash(file);
    const id = CryptoUtils.generateIconId(file, content);
    
    icons.push({
      id,
      filename: file.split('/').pop(),
      path: file,
      content,
      size,
      hash
    });
  }
  
  // 3. 检测重复
  const detector = new DuplicateDetector();
  const duplicates = await detector.findDuplicates(icons);
  
  // 4. AI分析
  const engine = new AIAnalysisEngine(defaultConfig);
  const uniqueIcons = icons.filter(icon => 
    !duplicates.some(group => 
      group.duplicates.some(dup => dup.id === icon.id)
    )
  );
  
  const results = await engine.batchAnalyze(uniqueIcons);
  
  // 5. 处理结果
  for (const [iconId, result] of results) {
    const icon = icons.find(i => i.id === iconId);
    if (icon) {
      const processedContent = SVGUtils.embedMetadata(icon.content, {
        category: result.category,
        tags: result.tags,
        confidence: result.confidence,
        processedAt: new Date(),
        version: '1.0.0'
      });
      
      await FileUtils.writeFile(`./processed/${icon.filename}`, processedContent);
    }
  }
  
  console.log('处理完成!');
}
```

## 错误处理

### 常见错误类型

1. **文件系统错误**
   ```typescript
   try {
     await FileUtils.scanDirectory('./nonexistent');
   } catch (error) {
     console.error('目录不存在:', error.message);
   }
   ```

2. **API错误**
   ```typescript
   try {
     await engine.analyzeIcon(iconInfo);
   } catch (error) {
     if (error.message.includes('API key')) {
       console.error('API密钥无效');
     } else if (error.message.includes('timeout')) {
       console.error('API请求超时');
     }
   }
   ```

3. **格式错误**
   ```typescript
   try {
     const isValid = await SVGUtils.validateSVG(content);
     if (!isValid) {
       throw new Error('无效的SVG格式');
     }
   } catch (error) {
     console.error('SVG验证失败:', error.message);
   }
   ```

### 错误恢复策略

```typescript
async function processWithRetry(processor: IconProcessor, inputDir: string, maxRetries: number = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await processor.processDirectory(inputDir);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`尝试 ${attempt} 失败，重试中...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}
```

---

**注意**: 使用这些API前，请确保已正确设置 `OPENAI_API_KEY` 环境变量，并且有有效的网络连接来访问OpenAI API。