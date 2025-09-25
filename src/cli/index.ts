#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { IconProcessor } from '../processor/icon-processor.js';
import { ProcessingOptions } from '../types/index.js';
import { defaultConfig } from '../config/index.js';

const program = new Command();

program
  .name('icon-normalizer')
  .description('AI-powered icon classification and deduplication tool')
  .version('1.0.0');

program
  .command('process')
  .description('Process a directory of SVG icons')
  .argument('<input-dir>', 'Directory containing SVG icons to process')
  .option('-o, --output <dir>', 'Output directory for processed icons', './processed')
  .option('--no-backup', 'Skip creating backup of original files')
  .option('-t, --threshold <number>', 'Similarity threshold for duplicate detection', '0.8')
  .option('-c, --concurrent <number>', 'Maximum concurrent AI requests', '3')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--dry-run', 'Preview changes without modifying files')
  .action(async (inputDir: string, options) => {
    try {
      console.log(chalk.blue('🚀 Starting icon processing...'));
      console.log(chalk.gray(`Input directory: ${inputDir}`));

      // Validate OpenAI API key
      if (!defaultConfig.ai.apiKey) {
        console.error(chalk.red('❌ OpenAI API key not found. Please set OPENAI_API_KEY environment variable.'));
        process.exit(1);
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
      console.log(chalk.green('\n✅ Processing completed!'));
      console.log(chalk.cyan(`\n📊 Results:`));
      console.log(`  Total icons: ${result.totalIcons}`);
      console.log(`  Processed icons: ${result.processedIcons}`);
      console.log(`  Duplicate groups: ${result.duplicates.length}`);
      console.log(`  Processing time: ${(result.processingTime / 1000).toFixed(2)}s`);

      if (result.duplicates.length > 0) {
        console.log(chalk.yellow('\n🔍 Duplicates found:'));
        result.duplicates.slice(0, 5).forEach((group, index) => {
          console.log(`  ${index + 1}. ${group.master.filename} + ${group.duplicates.length} duplicates`);
        });
        if (result.duplicates.length > 5) {
          console.log(`  ... and ${result.duplicates.length - 5} more groups`);
        }
      }

      if (result.errors.length > 0) {
        console.log(chalk.red('\n❌ Errors encountered:'));
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      if (!options.dryRun) {
        console.log(chalk.green(`\n💾 Processed icons saved to: ${processingOptions.outputDir}`));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze a single SVG icon')
  .argument('<svg-file>', 'Path to the SVG file to analyze')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (svgFile: string, options) => {
    try {
      if (!defaultConfig.ai.apiKey) {
        console.error(chalk.red('❌ OpenAI API key not found. Please set OPENAI_API_KEY environment variable.'));
        process.exit(1);
      }

      const { IconProcessor } = await import('../processor/icon-processor.js');
      const processor = new IconProcessor({ verbose: options.verbose });
      
      // Note: You would need to add a method to analyze single files
      console.log(chalk.blue('🔍 Analyzing single icon...'));
      console.log(chalk.yellow('⚠️  Single icon analysis not yet implemented.'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    console.log(chalk.blue('⚙️  Current Configuration:'));
    console.log(JSON.stringify(defaultConfig, null, 2));
  });

program.parse();