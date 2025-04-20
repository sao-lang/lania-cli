import { writeFile } from 'fs/promises';
import { dirname } from 'path';
import ejs from 'ejs';
import { mkDirs } from '../../utils/dir';
import { getFileExt } from '../../utils/file';
import { PrettierSupportFileType } from '@lania-cli/types';
import path from 'path';
import fs from 'fs/promises';

export class EjsRenderer {
    format: (code: string, fileType: string) => string;
    constructor (format: (code: string, fileType: string) => string) {
        this.format = format;
    }
  async renderFromString(template: string, data: Record<string, any>, outputPath): Promise<string> {
    const transformedCode = ejs.render(template, data, { async: true });
      const ext = getFileExt<PrettierSupportFileType>(outputPath);
      const formatedCode = this.format(transformedCode, ext) ?? transformedCode;
      if (outputPath) {
          
          await mkDirs(dirname(outputPath));
        await writeFile(outputPath, formatedCode, 'utf-8');
      }
  }

  /**
   * 渲染模板文件
   * @param filePath 模板文件路径（绝对路径或相对路径）
   * @param data 注入的数据对象
   */
  async renderFromFile(filePath: string, data: Record<string, any>, outputPath: string): Promise<string> {
    const absPath = path.resolve(filePath);
    const template = await fs.readFile(absPath, 'utf-8');
    const transformedCode this.renderFromString(template, data);
      const ext = getFileExt<PrettierSupportFileType>(outputPath);
      const formatedCode = this.format(transformedCode) ?? transformedCode;
      if (outputPath) {
          await mkDirs(dirname(outputPath));
        await writeFile(outputPath, formatedCode, 'utf-8');
      }
  }
}
