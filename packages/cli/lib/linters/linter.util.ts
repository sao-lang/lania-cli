import ConfigurationLoader, { ConfigurationLoadType } from '@configuration/configuration.loader';
import to from '@utils/to';
import { readdir, stat } from 'fs/promises';
import { extname, join } from 'path';

export type LinterConfiguration = ConfigurationLoadType | Record<string, any>;

export const getModuleConfig = async (config: LinterConfiguration) => {
    if (typeof config === 'string') {
        const [loadErr, moduleConfig] = await to(new ConfigurationLoader().load(config));
        if (loadErr) {
            throw loadErr;
        }
        return moduleConfig as Record<string, any>;
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

export const getFileExt = <T extends string>(filePath: string) => {
    return extname(filePath).replace('.', '') as T;
};
