import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { extname } from 'path';

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
    // 去除末尾多余的斜杠（根目录除外）
    const normalizedPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    const lastSlashIndex = normalizedPath.lastIndexOf('/');
    if (lastSlashIndex === -1) {
        // 没有斜杠，全部是文件名，没有目录
        return { directoryPath: '', baseName: normalizedPath };
    }
    const directoryPath = normalizedPath.slice(0, lastSlashIndex + 1); // 保留末尾斜杠
    const baseName = normalizedPath.slice(lastSlashIndex + 1) || null;
    return { directoryPath, baseName };
};
