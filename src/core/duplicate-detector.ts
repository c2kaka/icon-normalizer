import { IconInfo, DuplicateGroup, ProcessingOptions } from '../types';
import { CryptoUtils } from '../utils/crypto-utils';

export class DuplicateDetector {
  private options: ProcessingOptions;

  constructor(options: ProcessingOptions = {}) {
    this.options = {
      similarityThreshold: 0.8,
      ...options,
    };
  }

  async findDuplicates(icons: IconInfo[]): Promise<DuplicateGroup[]> {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    // First pass: find exact duplicates (same hash)
    const exactDuplicates = this.findExactDuplicates(icons);
    groups.push(...exactDuplicates);

    // Second pass: find similar duplicates based on content similarity
    const similarDuplicates = await this.findSimilarDuplicates(icons, processed);
    groups.push(...similarDuplicates);

    return groups;
  }

  private findExactDuplicates(icons: IconInfo[]): DuplicateGroup[] {
    const hashGroups = new Map<string, IconInfo[]>();
    
    // Group by hash
    icons.forEach(icon => {
      if (!hashGroups.has(icon.hash)) {
        hashGroups.set(icon.hash, []);
      }
      hashGroups.get(icon.hash)!.push(icon);
    });

    const groups: DuplicateGroup[] = [];
    
    hashGroups.forEach((duplicateIcons, hash) => {
      if (duplicateIcons && duplicateIcons.length > 1) {
        // Sort by filename to ensure consistent master selection
        duplicateIcons.sort((a, b) => a.filename.localeCompare(b.filename));
        
        const master = duplicateIcons[0];
        if (!master) return;
        
        const duplicates = duplicateIcons.slice(1);
        
        groups.push({
          master,
          duplicates,
          similarity: 1.0, // Exact match
          recommendation: this.generateRecommendation(master, duplicates, 1.0),
        });
      }
    });

    return groups;
  }

  private async findSimilarDuplicates(icons: IconInfo[], processed: Set<string>): Promise<DuplicateGroup[]> {
    const groups: DuplicateGroup[] = [];
    
    for (let i = 0; i < icons.length; i++) {
      const icon1 = icons[i];
      
      if (!icon1 || processed.has(icon1.id)) {
        continue;
      }

      const similarIcons: IconInfo[] = [];
      
      for (let j = i + 1; j < icons.length; j++) {
        const icon2 = icons[j];
        
        if (!icon2 || processed.has(icon2.id)) {
          continue;
        }

        // Skip if already in exact duplicates (same hash)
        if (icon1.hash === icon2.hash) {
          continue;
        }

        const similarity = await this.calculateContentSimilarity(icon1, icon2);
        
        if (similarity >= this.options.similarityThreshold!) {
          similarIcons.push(icon2);
          processed.add(icon2.id);
        }
      }

      if (similarIcons.length > 0) {
        const master = icon1;
        const duplicates = similarIcons;
        
        const similarities = await Promise.all(
          similarIcons.map(icon => this.calculateContentSimilarity(master, icon))
        );
        const minSimilarity = Math.min(...similarities);
        
        groups.push({
          master,
          duplicates,
          similarity: minSimilarity,
          recommendation: this.generateRecommendation(master, duplicates, minSimilarity),
        });
        
        processed.add(master.id);
      }
    }

    return groups;
  }

  private async calculateContentSimilarity(icon1: IconInfo, icon2: IconInfo): Promise<number> {
    // Simple hash-based similarity calculation
    // In a more sophisticated implementation, you could:
    // - Use image comparison algorithms
    // - Compare SVG structures
    // - Use vector embeddings
    
    return CryptoUtils.calculateSimilarity(icon1.hash, icon2.hash);
  }

  private generateRecommendation(master: IconInfo, duplicates: IconInfo[], similarity: number): 'keep' | 'remove' | 'review' {
    if (similarity === 1.0) {
      return 'remove'; // Exact duplicates can be safely removed
    } else if (similarity >= 0.9) {
      return 'keep'; // Very similar, keep master
    } else {
      return 'review'; // Somewhat similar, needs human review
    }
  }

  generateReport(groups: DuplicateGroup[]): string {
    const totalDuplicates = groups.reduce((sum, group) => sum + group.duplicates.length, 0);
    const exactDuplicates = groups.filter(g => g.similarity === 1.0).length;
    const similarDuplicates = groups.filter(g => g.similarity < 1.0).length;
    
    let report = `Duplicate Analysis Report\n`;
    report += `========================\n\n`;
    report += `Total duplicate groups found: ${groups.length}\n`;
    report += `Total duplicate files: ${totalDuplicates}\n`;
    report += `Exact duplicates: ${exactDuplicates} groups\n`;
    report += `Similar duplicates: ${similarDuplicates} groups\n\n`;

    groups.forEach((group, index) => {
      report += `Group ${index + 1} (${group.similarity === 1.0 ? 'Exact' : 'Similar'} - ${group.recommendation})\n`;
      report += `  Master: ${group.master.filename}\n`;
      report += `  Duplicates: ${group.duplicates.map(d => d.filename).join(', ')}\n`;
      report += `  Similarity: ${(group.similarity * 100).toFixed(1)}%\n\n`;
    });

    return report;
  }
}