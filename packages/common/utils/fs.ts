import { existsSync } from 'fs';
import { access, mkdir, readdir, readFile, stat } from 'fs/promises';
import { dirname, extname, join, relative, resolve } from 'path';
import ignore from 'ignore';
import { TraverseOptions } from '@lania-cli/types';

export const getFileExt = <T extends string>(filePath: string) => {
    return extname(filePath).replace('.', '') as T;
};

export const mkDirs = async (dirPath: string) => {
    if (existsSync(dirPath)) {
        return true;
    } else {
        const result = await mkDirs(dirname(dirPath));
        if (result) {
            await mkdir(dirPath);
            return true;
        }
    }
};

export const isUnixAbsoluteDirPath = (p: string) => {
    if (typeof p !== 'string' || !p.trim()) return false;
    if (!p.startsWith('/') || p.includes('\\')) return false;
    // eslint-disable-next-line no-control-regex
    if (/\x00/.test(p)) return false;

    // 特殊处理根目录
    if (p === '/') return true;

    const segments = p.split('/');
    // 忽略第一个空段（由起始斜杠产生），只检查后续段
    if (segments.slice(1).some((seg) => seg === '')) return false;

    return true;
};

export const isUnixAbsoluteFilePath = (p: string) => {
    if (typeof p !== 'string' || !p.trim()) return false;
    if (!p.startsWith('/') || p.includes('\\')) return false;
    // eslint-disable-next-line no-control-regex
    if (/\x00/.test(p)) return false;

    const segments = p.split('/');
    // 忽略第一个空段（由起始斜杠产生），只检查后续段
    if (segments.slice(1).some((seg) => seg === '')) return false;

    const lastSegment = segments[segments.length - 1];
    // 允许隐藏文件，只需确保有点号且不以点号结尾
    if (!lastSegment.includes('.') || lastSegment.endsWith('.')) {
        return false;
    }
    return true;
};

export const splitDirectoryAndFileName = (path: string) => {
    if (!path) return { directoryPath: '', baseName: null };

    const hasTrailingSlash = path.endsWith('/');
    const normalizedPath = hasTrailingSlash && path.length > 1 ? path.slice(0, -1) : path;
    const lastSlashIndex = normalizedPath.lastIndexOf('/');

    if (hasTrailingSlash) {
        // 是目录：末尾是 `/`
        return {
            directoryPath: normalizedPath,
            baseName: null,
        };
    }

    if (lastSlashIndex === -1) {
        // 没有 `/`，只有文件名
        return {
            directoryPath: '',
            baseName: normalizedPath,
        };
    }

    return {
        directoryPath: normalizedPath.slice(0, lastSlashIndex),
        baseName: normalizedPath.slice(lastSlashIndex + 1),
    };
};

export const fileExists = async (filePath: string) => {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
};

export const traverseFiles = async (
    inputDir: string,
    cb?: (filePath: string) => Promise<void>,
    options: TraverseOptions = {}
) => {
    const { ignoreFilePath, ignorePatterns = [] } = options;

    const rootDir = resolve(inputDir); // 统一为绝对路径
    const ig = ignore();

    if (ignoreFilePath) {
        try {
            const content = await readFile(ignoreFilePath, 'utf-8');
            ig.add(content.split('\n'));
        } catch (err) {
            // 忽略读取错误
        }
    }

    ig.add(ignorePatterns);

    const walk = async (currentDir: string) => {
        const entries = await readdir(currentDir);
        for (const entry of entries) {
            const fullPath = join(currentDir, entry);
            const relativePath = relative(rootDir, fullPath); // 相对于 rootDir 的相对路径
            console.log('---------', relativePath, '---------')
            if (ig.ignores(relativePath)) continue;

            const stats = await stat(fullPath);
            if (stats.isDirectory()) {
                await walk(fullPath);
            } else if (stats.isFile()) {
                await cb?.(fullPath);
            }
        }
    };

    await walk(rootDir);
};
