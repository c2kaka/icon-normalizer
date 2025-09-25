// Core types for the icon-normalizer MVP

export interface AnalysisResult {
  id: string;
  category: string;
  confidence: number;
  tags: string[];
  duplicates: string[];
  metadata: {
    processedAt: Date;
    version: string;
    similarity?: number;
  };
}

export interface IconInfo {
  id: string;
  filename: string;
  path: string;
  content: string;
  size: number;
  hash: string;
}

export interface DuplicateGroup {
  master: IconInfo;
  duplicates: IconInfo[];
  similarity: number;
  recommendation: 'keep' | 'remove' | 'review';
}

export interface ProcessingOptions {
  outputDir?: string;
  dryRun?: boolean;
  backup?: boolean;
  similarityThreshold?: number;
  maxConcurrent?: number;
  verbose?: boolean;
}

export interface ProcessingResult {
  totalIcons: number;
  processedIcons: number;
  duplicates: DuplicateGroup[];
  processingTime: number;
  errors: string[];
}

export interface Config {
  ai: {
    model: string;
    apiKey: string;
    maxConcurrent: number;
    timeout: number;
  };
  processing: {
    outputDir: string;
    backup: boolean;
    similarityThreshold: number;
  };
  categories: Record<string, string[]>;
}

export interface AIResponse {
  category: string;
  tags: string[];
  confidence: number;
  reasoning?: string;
}