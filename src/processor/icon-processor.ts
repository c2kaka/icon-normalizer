import ora from "ora";
import * as path from "path";
import { defaultConfig } from "../config/index.js";
import { AIEngineFactory } from "../core/ai-engine-factory.js";
import { DuplicateDetector } from "../core/duplicate-detector.js";
import {
  DuplicateGroup,
  IconInfo,
  ProcessingOptions,
  ProcessingResult,
} from "../types/index.js";
import { CryptoUtils } from "../utils/crypto-utils.js";
import { FileUtils } from "../utils/file-utils.js";
import { SVGUtils } from "../utils/svg-utils.js";

export class IconProcessor {
  private options: ProcessingOptions;
  private aiEngine: any; // 使用any类型以支持不同的AI引擎
  private duplicateDetector: DuplicateDetector;
  private config = defaultConfig;

  constructor(options: ProcessingOptions = {}) {
    this.options = {
      outputDir: "./processed",
      backup: true,
      similarityThreshold: 0.8,
      maxConcurrent: 3,
      verbose: false,
      ...options,
    };

    this.aiEngine = AIEngineFactory.createEngine(this.config);
    this.duplicateDetector = new DuplicateDetector(this.options);
  }

  async processDirectory(inputDir: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const spinner = ora("Processing icons...").start();
    const errors: string[] = [];

    try {
      // 检查AI服务是否可用
      spinner.text = "Checking AI service...";
      const serviceCheck = await AIEngineFactory.checkService(this.config);
      if (!serviceCheck.available) {
        spinner.fail("AI service check failed");
        throw new Error(serviceCheck.message || "AI service unavailable");
      }
      spinner.text = "AI service is ready";

      // Scan for SVG files (排除备份和输出目录)
      spinner.text = "Scanning for SVG files...";
      const excludeDirs = ["backup", "duplicates"];
      // 动态排除用户指定的输出目录
      if (this.options.outputDir) {
        const outputDirName = path.basename(
          path.resolve(this.options.outputDir)
        );
        excludeDirs.push(outputDirName);
      }
      const svgFiles = await FileUtils.scanDirectory(
        inputDir,
        true,
        excludeDirs
      );

      if (svgFiles.length === 0) {
        spinner.warn("No SVG files found in the specified directory");
        return {
          totalIcons: 0,
          processedIcons: 0,
          duplicates: [],
          processingTime: Date.now() - startTime,
          errors: ["No SVG files found"],
        };
      }

      // Create backup if enabled
      if (this.options.backup) {
        spinner.text = "Creating backup...";
        await this.createBackup(inputDir, svgFiles);
      }

      // Load icon information
      spinner.text = "Loading icon information...";
      const icons = await this.loadIcons(svgFiles);

      // Find duplicates
      spinner.text = "Finding duplicates...";
      const duplicates = await this.duplicateDetector.findDuplicates(icons);

      // Analyze unique icons with AI
      spinner.text = "Analyzing icons with AI...";
      const uniqueIcons = this.getUniqueIcons(icons, duplicates);
      const analysisResults = await this.aiEngine.batchAnalyze(uniqueIcons);

      // 记录AI分析结果
      if (this.options.verbose) {
        console.log("\n📊 AI Analysis Results:");
        console.log(`Total unique icons analyzed: ${uniqueIcons.length}`);
        console.log(`Analysis results returned: ${analysisResults.size}`);

        analysisResults.forEach((result: any, iconId: string) => {
          const icon = uniqueIcons.find((i) => i.id === iconId);
          console.log(`\n🔍 ${icon?.filename || iconId}:`);
          console.log(`  Category: ${result.category}`);
          console.log(`  Tags: [${result.tags.join(", ")}]`);
          console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
          if (result.reasoning) {
            console.log(`  Reasoning: ${result.reasoning}`);
          }
        });
      } else {
        // 简化版日志
        console.log(
          `\n📊 Analyzed ${analysisResults.size}/${uniqueIcons.length} unique icons with AI`
        );
      }

      // Process and save results
      spinner.text = "Processing and saving results...";
      const processedIcons = await this.processAndSaveResults(
        icons,
        analysisResults,
        duplicates,
        inputDir
      );

      spinner.succeed(`Processed ${processedIcons} icons successfully`);

      return {
        totalIcons: icons.length,
        processedIcons: processedIcons,
        duplicates,
        processingTime: Date.now() - startTime,
        errors,
      };
    } catch (error) {
      spinner.fail(`Processing failed: ${error}`);
      errors.push(`Processing failed: ${error}`);
      return {
        totalIcons: 0,
        processedIcons: 0,
        duplicates: [],
        processingTime: Date.now() - startTime,
        errors,
      };
    }
  }

  private async createBackup(inputDir: string, files: string[]): Promise<void> {
    const backupDir = path.join(inputDir, "backup", Date.now().toString());
    await FileUtils.ensureDir(backupDir);

    const promises = files.map(async (file) => {
      const relativePath = path.relative(inputDir, file);
      const backupPath = path.join(backupDir, relativePath);
      await FileUtils.ensureDir(path.dirname(backupPath));
      await FileUtils.copyFile(file, backupPath);
    });

    await Promise.all(promises);
  }

  private async loadIcons(filePaths: string[]): Promise<IconInfo[]> {
    const icons: IconInfo[] = [];

    for (const filePath of filePaths) {
      try {
        const content = await FileUtils.readFile(filePath);
        const size = await FileUtils.getFileSize(filePath);
        const hash = await FileUtils.getFileHash(filePath);
        const id = CryptoUtils.generateIconId(path.basename(filePath), content);

        icons.push({
          id,
          filename: path.basename(filePath),
          path: filePath,
          content,
          size,
          hash,
        });
      } catch (error) {
        console.warn(`Failed to load icon ${filePath}:`, error);
      }
    }

    return icons;
  }

  private getUniqueIcons(
    icons: IconInfo[],
    duplicates: DuplicateGroup[]
  ): IconInfo[] {
    const duplicateIds = new Set<string>();

    duplicates.forEach((group) => {
      group.duplicates.forEach((duplicate) => {
        duplicateIds.add(duplicate.id);
      });
    });

    return icons.filter((icon) => !duplicateIds.has(icon.id));
  }

  private async processAndSaveResults(
    icons: IconInfo[],
    analysisResults: Map<string, any>,
    duplicates: DuplicateGroup[],
    inputDir: string
  ): Promise<number> {
    let processedCount = 0;
    const outputDir = this.options.outputDir!;

    await FileUtils.ensureDir(outputDir);

    // Process duplicates
    for (const group of duplicates) {
      const analysis = analysisResults.get(group.master.id);
      if (analysis) {
        await this.saveIconWithMetadata(group.master, analysis, outputDir);
        processedCount++;
      }

      // Save duplicates to separate folder
      const duplicatesDir = path.join(outputDir, "duplicates");
      await FileUtils.ensureDir(duplicatesDir);

      for (const duplicate of group.duplicates) {
        await this.saveIconWithMetadata(
          duplicate,
          {
            category: "duplicate",
            tags: [],
            confidence: 1.0,
            reasoning: `Duplicate of ${group.master.filename}`,
          },
          duplicatesDir
        );
      }
    }

    // Process remaining unique icons
    for (const icon of icons) {
      const analysis = analysisResults.get(icon.id);
      if (analysis) {
        await this.saveIconWithMetadata(icon, analysis, outputDir);
        processedCount++;
      }
    }

    // Save processing report
    await this.saveReport(duplicates, outputDir);

    return processedCount;
  }

  private async saveIconWithMetadata(
    icon: IconInfo,
    analysis: any,
    outputDir: string
  ): Promise<void> {
    const contentWithMetadata = SVGUtils.embedMetadata(icon.content, {
      category: analysis.category,
      tags: analysis.tags,
      confidence: analysis.confidence,
      processedAt: new Date(),
      version: "1.0.0",
    });

    const outputPath = path.join(outputDir, icon.filename);
    await FileUtils.writeFile(outputPath, contentWithMetadata);
  }

  private async saveReport(
    duplicates: DuplicateGroup[],
    outputDir: string
  ): Promise<void> {
    const report = this.duplicateDetector.generateReport(duplicates);
    const reportPath = path.join(outputDir, "duplicate-report.txt");
    await FileUtils.writeFile(reportPath, report);
  }
}
