import { createHash } from "crypto";
import fs from "fs-extra";
import * as path from "path";

export class FileUtils {
  static async getFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return createHash("sha256").update(content).digest("hex");
  }

  static async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  static async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  static async copyFile(src: string, dest: string): Promise<void> {
    await fs.copy(src, dest);
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, "utf-8");
  }

  static async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, "utf-8");
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  static getFileName(filePath: string): string {
    return path.basename(filePath);
  }

  static getFileExtension(filePath: string): string {
    return path.extname(filePath);
  }

  static joinPaths(...paths: string[]): string {
    return path.join(...paths);
  }

  static async scanDirectory(
    dirPath: string,
    recursive: boolean = true,
    excludeDirs: string[] = ["backup", "processed", "duplicates"]
  ): Promise<string[]> {
    const files: string[] = [];

    if (recursive) {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 排除指定的目录（如 backup、processed 等）
          if (!excludeDirs.includes(entry.name)) {
            const subFiles = await this.scanDirectory(
              fullPath,
              recursive,
              excludeDirs
            );
            files.push(...subFiles);
          }
        } else if (entry.isFile() && entry.name.endsWith(".svg")) {
          files.push(fullPath);
        }
      }
    } else {
      const entries = await fs.readdir(dirPath);
      files.push(
        ...entries
          .filter((file) => file.endsWith(".svg"))
          .map((file) => path.join(dirPath, file))
      );
    }

    return files;
  }
}
