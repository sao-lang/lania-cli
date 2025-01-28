import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
// 获取当前模块的文件路径
export const __filename = fileURLToPath(import.meta.url);

// 获取当前模块的目录路径
export const __dirname = dirname(__filename);

export const resolvePath = (dir, subPath) => {
    return resolve(resolve(__dirname, `../packages/${dir}`), subPath);
};

export const getPackageJsonDependencies = (packageName = 'core') => {
    const { dependencies, devDependencies } = JSON.parse(readFileSync(
        resolve(__dirname, `../packages/${packageName}/package.json`),
        'utf-8',
    ));
    return [...Object.keys(dependencies || {}), ...Object.keys(devDependencies || {})];
};
