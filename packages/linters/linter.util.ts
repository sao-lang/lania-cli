import { ConfigurationLoader } from '@lania-cli/common';
import { LinterConfiguration } from '@lania-cli/types';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export const getModuleConfig = async (config: LinterConfiguration) => {
    if (typeof config === 'string') {
        const moduleConfig = await ConfigurationLoader.load(config);
        return moduleConfig as Record<string, any>;
    }
    return config;
};

export const traverseFiles = async (dir: string, cb?: (filePath: string) => Promise<void>) => {
    const files = await readdir(dir);
    for (const file of files) {
        const filePath = join(dir, file);
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
            await traverseFiles(filePath, cb);
        }
        if (stats.isFile()) {
            await cb?.(filePath);
        }
    }
};