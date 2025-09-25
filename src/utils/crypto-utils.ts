import { createHash } from 'crypto';
import { IconInfo } from '../types/index.js';

export class CryptoUtils {
  static generateId(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  static calculateSimilarity(hash1: string, hash2: string): number {
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    return 1 - (distance / hash1.length);
  }

  static generateIconId(filename: string, content: string): string {
    const contentHash = createHash('sha256').update(content).digest('hex');
    const nameHash = createHash('sha256').update(filename).digest('hex');
    return `${nameHash.substring(0, 8)}-${contentHash.substring(0, 8)}`;
  }
}