import sharp from 'sharp';

/**
 * 图像预处理配置接口
 */
export interface PreprocessConfig {
  /** 目标尺寸（正方形边长） */
  targetSize: number;
  /** 背景颜色 (RGB) */
  backgroundColor: { r: number; g: number; b: number };
  /** 安全边距（像素） */
  padding: number;
  /** 是否启用自动裁剪留白 */
  autoCrop: boolean;
  /** 裁剪阈值（0-255，用于检测内容边界） */
  cropThreshold: number;
}

/**
 * 默认预处理配置
 */
export const DEFAULT_PREPROCESS_CONFIG: PreprocessConfig = {
  targetSize: 384,
  backgroundColor: { r: 245, g: 245, b: 245 }, // 浅灰色
  padding: 10,
  autoCrop: true,
  cropThreshold: 250, // 接近白色的像素会被视为背景
};

/**
 * 图像预处理器类
 * 用于处理图标PNG，包括透明通道处理、尺寸统一、留白裁剪等
 */
export class ImagePreprocessor {
  private config: PreprocessConfig;

  constructor(config: Partial<PreprocessConfig> = {}) {
    this.config = { ...DEFAULT_PREPROCESS_CONFIG, ...config };
  }

  /**
   * 预处理图像buffer
   * @param imageBuffer 输入图像buffer
   * @returns 处理后的PNG buffer
   */
  async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      let pipeline = sharp(imageBuffer);

      // 获取原始图像元数据
      const metadata = await pipeline.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to get image dimensions');
      }

      console.log(`Original image size: ${metadata.width}x${metadata.height}`);

      // 步骤 1: 透明通道处理 - 合成到背景色
      pipeline = await this.handleTransparency(pipeline, metadata);

      // 步骤 2: 自动裁剪多余留白（如果启用）
      if (this.config.autoCrop) {
        pipeline = await this.autoCropWhitespace(pipeline);
      }

      // 步骤 3: 统一尺寸并保持比例，添加填充
      pipeline = await this.resizeWithPadding(pipeline);

      // 步骤 4: 输出为高质量PNG
      const processedBuffer = await pipeline
        .png({
          quality: 100,
          compressionLevel: 6,
        })
        .toBuffer();

      console.log('Image preprocessing completed successfully');
      return processedBuffer;

    } catch (error) {
      throw new Error(
        `Image preprocessing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 处理透明通道 - 将透明背景合成到指定背景色
   * @param pipeline Sharp pipeline
   * @param metadata 图像元数据
   * @returns 处理后的pipeline
   */
  private async handleTransparency(
    pipeline: sharp.Sharp,
    metadata: sharp.Metadata
  ): Promise<sharp.Sharp> {
    // 如果图像有透明通道，将其合成到背景色
    if (metadata.hasAlpha) {
      console.log('Handling transparency with background color');
      pipeline = pipeline.flatten({
        background: this.config.backgroundColor,
      });
    }

    // 确保输出为RGB格式（移除alpha通道）
    pipeline = pipeline.removeAlpha();

    return pipeline;
  }

  /**
   * 自动裁剪多余留白
   * @param pipeline Sharp pipeline
   * @returns 裁剪后的pipeline
   */
  private async autoCropWhitespace(pipeline: sharp.Sharp): Promise<sharp.Sharp> {
    try {
      // 先获取当前图像
      const buffer = await pipeline.toBuffer();
      const image = sharp(buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return pipeline;
      }

      // 使用sharp的trim功能自动裁剪相似颜色的边缘
      // threshold参数控制颜色相似度，值越大越宽松
      const trimmed = image.trim({
        threshold: this.config.cropThreshold,
      });

      // 获取裁剪后的尺寸信息
      const trimmedMetadata = await trimmed.metadata();
      
      if (trimmedMetadata.width && trimmedMetadata.height) {
        console.log(
          `Auto-cropped from ${metadata.width}x${metadata.height} to ${trimmedMetadata.width}x${trimmedMetadata.height}`
        );
      }

      return trimmed;
    } catch (error) {
      console.warn('Auto-crop failed, using original image:', error);
      return pipeline;
    }
  }

  /**
   * 统一尺寸并保持比例，使用背景色填充到正方形
   * @param pipeline Sharp pipeline
   * @returns 处理后的pipeline
   */
  private async resizeWithPadding(pipeline: sharp.Sharp): Promise<sharp.Sharp> {
    try {
      const metadata = await pipeline.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to get image dimensions for resizing');
      }

      const originalWidth = metadata.width;
      const originalHeight = metadata.height;

      // 计算可用空间（减去两侧的padding）
      const availableSize = this.config.targetSize - (this.config.padding * 2);

      // 找出较长的边
      const maxDimension = Math.max(originalWidth, originalHeight);

      // 如果原图已经很小，不进行缩小（避免信息损失）
      // 但仍然需要填充到目标尺寸
      let scale = 1;
      if (maxDimension > availableSize) {
        scale = availableSize / maxDimension;
      }

      const newWidth = Math.round(originalWidth * scale);
      const newHeight = Math.round(originalHeight * scale);

      console.log(
        `Resizing from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight}, ` +
        `then padding to ${this.config.targetSize}x${this.config.targetSize}`
      );

      // 先resize保持比例
      let resized = pipeline.resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3, // 使用高质量的lanczos3插值，保持边缘锐度
        fit: 'inside',
      });

      // 然后使用extend添加背景色填充到正方形
      const leftPadding = Math.floor((this.config.targetSize - newWidth) / 2);
      const rightPadding = this.config.targetSize - newWidth - leftPadding;
      const topPadding = Math.floor((this.config.targetSize - newHeight) / 2);
      const bottomPadding = this.config.targetSize - newHeight - topPadding;

      resized = resized.extend({
        top: topPadding,
        bottom: bottomPadding,
        left: leftPadding,
        right: rightPadding,
        background: this.config.backgroundColor,
      });

      return resized;
    } catch (error) {
      throw new Error(
        `Resize with padding failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 更新配置
   * @param config 新的配置（部分）
   */
  updateConfig(config: Partial<PreprocessConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  getConfig(): PreprocessConfig {
    return { ...this.config };
  }
}

/**
 * 便捷函数：使用默认配置预处理图像
 * @param imageBuffer 输入图像buffer
 * @param config 可选的配置覆盖
 * @returns 处理后的PNG buffer
 */
export async function preprocessImage(
  imageBuffer: Buffer,
  config?: Partial<PreprocessConfig>
): Promise<Buffer> {
  const preprocessor = new ImagePreprocessor(config);
  return preprocessor.preprocessImage(imageBuffer);
}

