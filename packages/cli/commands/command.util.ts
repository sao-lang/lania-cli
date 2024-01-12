import ConfigurationLoader from '@lib/configuration/configuration.loader';
import path from 'path';

export const checkLaniaConfigFile = () => {};

export interface LanConfig {
    language?: 'JavaScript' | 'TypeScript';
    buildTool?: 'tsc' | 'vite' | 'webpack' | 'rollup';
    frame?: 'react' | 'vue' | 'svelte';
}

export const getLanConfig = async (lanConfigPath: string) => {
    let config: LanConfig = {};
    if (!lanConfigPath) {
        const lanConfig = await new ConfigurationLoader().load({
            module: 'lan',
            searchPlaces: ['lan.config.json'],
        });
        config = lanConfig;
    } else {
        const lanBasename = path.basename(lanConfigPath);
        const lanDirname = path.dirname(lanConfigPath);
        const lanConfig = await new ConfigurationLoader().load(
            {
                module: 'lan',
                searchPlaces: [lanBasename || 'lan.config.json'],
            },
            lanDirname,
        );
        config = lanConfig;
    }
    // if (JSON.stringify(config) === '{}') {
    //     throw new Error('LAN configuration not found!');
    // }
    return config;
};
