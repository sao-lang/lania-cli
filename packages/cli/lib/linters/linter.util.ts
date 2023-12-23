import ConfigurationLoader from '@configuration/configuration.loader';
import to from '@utils/to';
import { readdir, stat } from 'fs/promises';
import { extname, join } from 'path';

export type LinterConfiguration = string | Record<string, any>;

export const getModuleConfig = async (config: LinterConfiguration) => {
    if (typeof config === 'string') {
        const [loadErr, moduleConfig] = await to(
            new ConfigurationLoader().load(config as any, config),
        );
        if (loadErr) {
            throw loadErr;
        }
        return moduleConfig;
    }
    return config;
};

export const traverseFiles = async (dir: string, cb?: (filePath: string) => Promise<void>) => {
    const [readdirErr, files] = await to(readdir(dir));
    if (readdirErr) {
        throw readdirErr;
    }
    for (const file of files) {
        const filePath = join(dir, file);
        const [statErr, stats] = await to(stat(filePath));
        if (statErr) {
            throw statErr;
        }
        if (stats.isDirectory()) {
            traverseFiles(filePath);
        } else if (stats.isFile()) {
            await cb?.(filePath);
        }
    }
};

export const getFileExt = (filePath: string) => {
    return extname(filePath).replace('.', '') as string;
};
