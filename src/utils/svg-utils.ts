import * as xml2js from 'xml2js';
import { IconInfo } from '../types';

export class SVGUtils {
  static async parseSVG(content: string): Promise<any> {
    return new Promise((resolve, reject) => {
      xml2js.parseString(content, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  static async validateSVG(content: string): Promise<boolean> {
    try {
      const parsed = await this.parseSVG(content);
      return parsed && parsed.svg;
    } catch {
      return false;
    }
  }

  static async extractSVGInfo(content: string): Promise<Partial<IconInfo>> {
    try {
      const parsed = await this.parseSVG(content);
      const svg = parsed.svg;
      
      return {
        // Extract basic info from SVG
        // This can be expanded to extract more metadata
      };
    } catch (error) {
      throw new Error(`Failed to parse SVG: ${error}`);
    }
  }

  static embedMetadata(content: string, metadata: {
    category: string;
    tags: string[];
    confidence: number;
    processedAt: Date;
    version: string;
  }): string {
    const metadataComments = [
      `<!-- Icon Analysis Metadata -->`,
      `<!-- Category: ${metadata.category} -->`,
      `<!-- Tags: ${metadata.tags.join(', ')} -->`,
      `<!-- Confidence: ${metadata.confidence.toFixed(2)} -->`,
      `<!-- Processed: ${metadata.processedAt.toISOString()} -->`,
      `<!-- Version: ${metadata.version} -->`,
    ];

    // Find the SVG tag and insert metadata after it
    const svgTagMatch = content.match(/<svg[^>]*>/);
    if (svgTagMatch) {
      const insertPosition = svgTagMatch.index! + svgTagMatch[0].length;
      const beforeContent = content.substring(0, insertPosition);
      const afterContent = content.substring(insertPosition);
      
      return [
        beforeContent,
        '\n',
        ...metadataComments,
        '\n',
        afterContent
      ].join('');
    }

    // If no SVG tag found, prepend metadata
    return [...metadataComments, '\n', content].join('');
  }

  static extractMetadata(content: string): {
    category?: string;
    tags?: string[];
    confidence?: number;
    processedAt?: Date;
    version?: string;
  } {
    const metadata: any = {};
    
    const categoryMatch = content.match(/<!-- Category: ([^\n]+) -->/);
    if (categoryMatch && categoryMatch[1]) {
      metadata.category = categoryMatch[1].trim();
    }

    const tagsMatch = content.match(/<!-- Tags: ([^\n]+) -->/);
    if (tagsMatch && tagsMatch[1]) {
      metadata.tags = tagsMatch[1].split(',').map(tag => tag.trim());
    }

    const confidenceMatch = content.match(/<!-- Confidence: ([^\n]+) -->/);
    if (confidenceMatch && confidenceMatch[1]) {
      metadata.confidence = parseFloat(confidenceMatch[1]);
    }

    const processedAtMatch = content.match(/<!-- Processed: ([^\n]+) -->/);
    if (processedAtMatch && processedAtMatch[1]) {
      metadata.processedAt = new Date(processedAtMatch[1]);
    }

    const versionMatch = content.match(/<!-- Version: ([^\n]+) -->/);
    if (versionMatch && versionMatch[1]) {
      metadata.version = versionMatch[1].trim();
    }

    return metadata;
  }
}