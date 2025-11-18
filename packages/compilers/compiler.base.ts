import { ConfigurationLoader } from '@lania-cli/common';
import { mergeConfig as mergeViteConfig, loadConfigFromFile } from 'vite';
import * as mergeWebpackConfig from 'webpack-merge';
import deepmerge from 'deepmerge';
import { ConfigOption } from '@lania-cli/types';
import {} from 'rollup';

const createMergeConfig = <Config>(module: ConfigOption['module']) => {
    switch (module) {
        case 'vite':
        case 'rollup':
            return mergeViteConfig as (base: Config, config: Config) => Config;
        case 'webpack':
            return mergeWebpackConfig.merge as (base: Config, config: Config) => Config;
        default:
            return deepmerge as (base: Config, config: Config) => Config;
    }
};
const createGetConfig = (module: ConfigOption['module'], configPath?: string, options?: any) => {
    const loaders = {
        vite: (file: string) => {
            return loadConfigFromFile(options, file);
        },
    };
    return () => ConfigurationLoader.load(module, undefined, loaders[module as string]);
};

export abstract class Compiler<Config extends Record<string, any> = any, Server = any, Base = any> {
    protected abstract server: Server;
    protected abstract configOption: ConfigOption;
    protected abstract base: Base;

    protected async getBaseConfig(options?: any) {
        const { module, configPath } = this.configOption;
        if (!module) {
            return {} as Config;
        }
        const getConfig = createGetConfig(module, configPath, options);
        return await getConfig() as Config;
    }
    protected async mergeBaseConfig(baseConfig?: Config, options?: any): Promise<Config> {
        const mergeConfig = createMergeConfig<Config>(this.configOption.module);
        const config = await this.getBaseConfig(options);
        return baseConfig ? mergeConfig(config, baseConfig) : config;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected createServer(_baseConfig?: Config): Promise<void> | void {}
    protected closeServer(): Promise<void> | void {}
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected build(_baseConfig?: Config): Promise<void> | void {}
}
