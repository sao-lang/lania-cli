import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 获取当前模块的文件路径
export const __filename = fileURLToPath(import.meta.url);

// 获取当前模块的目录路径
export const __dirname = dirname(__filename);

export const resolvePath = (targetPath: string) => {
    return resolve(__dirname, targetPath);
};
