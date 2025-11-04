/**
 * 图像预处理测试脚本
 * 用于快速验证预处理效果
 * 
 * 使用方法:
 * node test-preprocess.js <svg-file-path>
 * 
 * 示例:
 * node test-preprocess.js sample-icons/wallet.svg
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { preprocessImage } from './dist/utils/image-preprocessor.js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPreprocess() {
  // 获取命令行参数
  const svgPath = process.argv[2];
  
  if (!svgPath) {
    console.error('❌ 请提供SVG文件路径');
    console.log('\n使用方法: node test-preprocess.js <svg-file-path>');
    console.log('示例: node test-preprocess.js sample-icons/wallet.svg');
    process.exit(1);
  }

  const absolutePath = path.resolve(__dirname, svgPath);
  
  try {
    console.log('🔍 读取SVG文件:', absolutePath);
    const svgContent = await fs.readFile(absolutePath, 'utf-8');
    
    console.log('📐 转换SVG为初始PNG...');
    // 先将SVG转换为PNG
    const initialPng = await sharp(Buffer.from(svgContent))
      .resize(768, 768, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    console.log('✨ 应用预处理...');
    // 应用预处理
    const processedPng = await preprocessImage(initialPng, {
      targetSize: 384,
      backgroundColor: { r: 245, g: 245, b: 245 },
      padding: 10,
      autoCrop: true,
      cropThreshold: 250,
    });
    
    // 创建输出目录
    const outputDir = path.join(__dirname, 'test-output');
    await fs.mkdir(outputDir, { recursive: true });
    
    // 保存结果
    const basename = path.basename(svgPath, '.svg');
    const originalPath = path.join(outputDir, `${basename}-original.png`);
    const processedPath = path.join(outputDir, `${basename}-processed.png`);
    
    await fs.writeFile(originalPath, initialPng);
    await fs.writeFile(processedPath, processedPng);
    
    console.log('\n✅ 预处理完成！');
    console.log('📁 输出目录:', outputDir);
    console.log('📄 原始图片:', path.basename(originalPath));
    console.log('📄 处理后图片:', path.basename(processedPath));
    console.log('\n💡 提示: 可以使用图片查看器对比两张图片的效果');
    
  } catch (error) {
    console.error('❌ 处理失败:', error.message);
    process.exit(1);
  }
}

testPreprocess();

