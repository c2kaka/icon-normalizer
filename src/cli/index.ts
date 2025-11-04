#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { defaultConfig } from "../config/index.js";
import { AIEngineFactory } from "../core/ai-engine-factory.js";
import { IconProcessor } from "../processor/icon-processor.js";
import { ProcessingOptions } from "../types/index.js";

const program = new Command();

program
  .name("icon-normalizer")
  .description("AI-powered icon classification and deduplication tool")
  .version("1.0.0");

program
  .command("process")
  .description("Process a directory of SVG icons")
  .argument("<input-dir>", "Directory containing SVG icons to process")
  .option(
    "-o, --output <dir>",
    "Output directory for processed icons",
    "./processed"
  )
  .option("--no-backup", "Skip creating backup of original files")
  .option(
    "-t, --threshold <number>",
    "Similarity threshold for duplicate detection",
    "0.8"
  )
  .option("-c, --concurrent <number>", "Maximum concurrent AI requests", "3")
  .option("-v, --verbose", "Enable verbose output")
  .option("--dry-run", "Preview changes without modifying files")
  .option(
    "--provider <provider>",
    "AI provider (openai|ollama)",
    process.env.AI_PROVIDER || "openai"
  )
  .option("--model <model>", "AI model name")
  .option("--base-url <url>", "service URL", process.env.BASE_URL)
  .action(async (inputDir: string, options) => {
    try {
      console.log(chalk.blue("🚀 Starting icon processing..."));
      console.log(chalk.gray(`Input directory: ${inputDir}`));
      console.log(chalk.gray(`AI Provider: ${options.provider}`));

      // 动态更新配置
      if (options.provider === "ollama") {
        // 对于Ollama，不需要API密钥检查
        if (options.model) {
          defaultConfig.ai.model = options.model;
        }
        if (options.baseUrl) {
          defaultConfig.ai.baseUrl = options.baseUrl;
        }
        defaultConfig.ai.provider = "ollama";
      } else {
        // 对于OpenAI，检查API密钥
        if (!defaultConfig.ai.apiKey) {
          console.error(
            chalk.red(
              "❌ OpenAI API key not found. Please set OPENAI_API_KEY environment variable."
            )
          );
          process.exit(1);
        }
        if (options.model) {
          defaultConfig.ai.model = options.model;
        }
        defaultConfig.ai.provider = "openai";
      }

      const processingOptions: ProcessingOptions = {
        outputDir: options.output,
        backup: options.backup,
        similarityThreshold: parseFloat(options.threshold),
        maxConcurrent: parseInt(options.concurrent),
        verbose: options.verbose,
        dryRun: options.dryRun,
      };

      const processor = new IconProcessor(processingOptions);
      const result = await processor.processDirectory(inputDir);

      // Display results
      console.log(chalk.green("\n✅ Processing completed!"));
      console.log(chalk.cyan(`\n📊 Results:`));
      console.log(`  Total icons: ${result.totalIcons}`);
      console.log(`  Processed icons: ${result.processedIcons}`);
      console.log(`  Duplicate groups: ${result.duplicates.length}`);
      console.log(
        `  Processing time: ${(result.processingTime / 1000).toFixed(2)}s`
      );

      if (result.duplicates.length > 0) {
        console.log(chalk.yellow("\n🔍 Duplicates found:"));
        result.duplicates.slice(0, 5).forEach((group, index) => {
          console.log(
            `  ${index + 1}. ${group.master.filename} + ${
              group.duplicates.length
            } duplicates`
          );
        });
        if (result.duplicates.length > 5) {
          console.log(`  ... and ${result.duplicates.length - 5} more groups`);
        }
      }

      if (result.errors.length > 0) {
        console.log(chalk.red("\n❌ Errors encountered:"));
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      if (!options.dryRun) {
        console.log(
          chalk.green(
            `\n💾 Processed icons saved to: ${
              result.outputPath || processingOptions.outputDir
            }`
          )
        );
        if (result.modelName) {
          console.log(chalk.cyan(`📦 Model: ${result.modelName}`));
        }
        console.log(
          chalk.cyan(
            `📄 Analysis summary: ${result.outputPath}/analysis-summary.json`
          )
        );
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));

      // 提供帮助信息
      if (
        error instanceof Error &&
        (error.message.includes("Ollama") || error.message.includes("ollama"))
      ) {
        console.log(chalk.yellow("\n💡 Ollama Help:"));
        console.log(chalk.yellow(AIEngineFactory.getProviderHelp("ollama")));
      } else if (
        error instanceof Error &&
        (error.message.includes("API key") || error.message.includes("OpenAI"))
      ) {
        console.log(chalk.yellow("\n💡 OpenAI Help:"));
        console.log(chalk.yellow(AIEngineFactory.getProviderHelp("openai")));
      }

      process.exit(1);
    }
  });

program
  .command("analyze")
  .description("Analyze a single SVG icon")
  .argument("<svg-file>", "Path to the SVG file to analyze")
  .option("-v, --verbose", "Enable verbose output")
  .action(async (svgFile: string, options) => {
    try {
      if (!defaultConfig.ai.apiKey) {
        console.error(
          chalk.red(
            "❌ OpenAI API key not found. Please set OPENAI_API_KEY environment variable."
          )
        );
        process.exit(1);
      }

      const { IconProcessor } = await import("../processor/icon-processor.js");
      const processor = new IconProcessor({ verbose: options.verbose });

      // Note: You would need to add a method to analyze single files
      console.log(chalk.blue("🔍 Analyzing single icon..."));
      console.log(
        chalk.yellow("⚠️  Single icon analysis not yet implemented.")
      );
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command("check")
  .description("Check AI service availability")
  .option(
    "--provider <provider>",
    "AI provider to check (openai|ollama)",
    process.env.AI_PROVIDER || "openai"
  )
  .action(async (options) => {
    console.log(chalk.blue("🔍 Checking AI service availability..."));

    // 临时配置用于检查
    const checkConfig = { ...defaultConfig };
    checkConfig.ai.provider = options.provider;

    const result = await AIEngineFactory.checkService(checkConfig);

    if (result.available) {
      console.log(chalk.green("✅ AI service is available!"));

      if (options.provider === "ollama") {
        // 显示可用模型
        try {
          const engine = AIEngineFactory.createEngine(checkConfig);
          if ("getAvailableModels" in engine) {
            const models = await (engine as any).getAvailableModels();
            console.log(
              chalk.cyan(`📋 Available models: ${models.join(", ")}`)
            );
          }
        } catch (error) {
          console.log(chalk.yellow("⚠️  Could not fetch model list"));
        }
      }
    } else {
      console.log(chalk.red("❌ AI service is not available"));
      console.log(chalk.yellow(result.message));

      console.log(chalk.cyan("\n💡 Configuration help:"));
      console.log(
        chalk.yellow(AIEngineFactory.getProviderHelp(options.provider))
      );
    }
  });

program
  .command("config")
  .description("Show current configuration")
  .action(() => {
    console.log(chalk.blue("⚙️  Current Configuration:"));
    console.log(JSON.stringify(defaultConfig, null, 2));
  });

program.parse();
