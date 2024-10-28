import ConfigurationLoader from '@lib/configuration/configuration.loader';
import path from 'path';

export const checkLaniaConfigFile = () => {};

export interface LanConfig {
    language?: 'JavaScript' | 'TypeScript';
    buildTool?: 'tsc' | 'vite' | 'webpack' | 'rollup';
    frame?: 'react' | 'vue' | 'svelte';
}

export const getLanConfig = async (lanConfigPath: string) => {
    if (!lanConfigPath) {
        return (await new ConfigurationLoader().load({
            module: 'lan',
            searchPlaces: ['lan.config.json'],
        })) as LanConfig;
    } else {
        const lanBasename = path.basename(lanConfigPath);
        const lanDirname = path.dirname(lanConfigPath);
        return (await new ConfigurationLoader().load(
            {
                module: 'lan',
                searchPlaces: [lanBasename || 'lan.config.json'],
            },
            lanDirname,
        )) as LanConfig;
    }
    // if (JSON.stringify(config) === '{}') {
    //     throw new Error('LAN configuration not found!');
    // }
};
