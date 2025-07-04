import { LaniaConfig } from '@lania-cli/types';
import { ConfigurationLoader } from '../lib/configuration/configuration.loader';
import path from 'path';

export const getLanConfig = async (lanConfigPath?: string) => {
    if (!lanConfigPath) {
        return (await ConfigurationLoader.load({
            module: 'lan',
            searchPlaces: ['lan.config.json'],
        })) as LaniaConfig;
    }
    const lanBasename = path.basename(lanConfigPath);
    const lanDirname = path.dirname(lanConfigPath);
    return (await ConfigurationLoader.load(
        {
            module: 'lan',
            searchPlaces: [lanBasename || 'lan.config.json'],
        },
        lanDirname,
    )) as LaniaConfig;
};
