import sharp from 'sharp';
import { preprocessImage, PreprocessConfig } from './image-preprocessor.js';

/**
 * 将 SVG 内容转换为 PNG 格式的 Base64 字符串（带预处理）
 * @param svgContent SVG 文件的字符串内容
 * @param targetSize 输出 PNG 的目标尺寸（默认 384px，正方形）
 * @param preprocessConfig 可选的预处理配置
 * @returns Base64 编码的 PNG 图片字符串
 */
export async function convertSvgToPngBase64(
  svgContent: string,
  targetSize: number = 384,
  preprocessConfig?: Partial<PreprocessConfig>
): Promise<string> {
  try {
    // 步骤 1: 将 SVG 渲染为高分辨率的 PNG（保留细节）
    // 使用更高的初始分辨率以保证质量
    const initialSize = Math.max(targetSize * 2, 768);
    
    const rawPngBuffer = await sharp(Buffer.from(svgContent))
      .resize(initialSize, initialSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 } // 保留透明通道
      })
      .png()
      .toBuffer();

    // 步骤 2: 应用图像预处理
    const processedBuffer = await preprocessImage(rawPngBuffer, {
      targetSize,
      ...preprocessConfig,
    });

    // 步骤 3: 转换为 Base64
    return processedBuffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to convert SVG to PNG: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 将 SVG 内容转换为 JPEG 格式的 Base64 字符串
 * @param svgContent SVG 文件的字符串内容
 * @param width 输出 JPEG 的宽度（默认 512px）
 * @param height 输出 JPEG 的高度（默认 512px）
 * @param quality JPEG 质量 (1-100，默认 90)
 * @returns Base64 编码的 JPEG 图片字符串
 */
export async function convertSvgToJpegBase64(
  svgContent: string,
  width: number = 512,
  height: number = 512,
  quality: number = 90
): Promise<string> {
  try {
    // 使用 sharp 将 SVG 转换为 JPEG
    const jpegBuffer = await sharp(Buffer.from(svgContent))
      .resize(width, height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255 } // 白色背景（JPEG 不支持透明）
      })
      .jpeg({ quality })
      .toBuffer();

    // 转换为 Base64
    return jpegBuffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to convert SVG to JPEG: ${error instanceof Error ? error.message : String(error)}`);
  }
}

