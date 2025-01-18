/* eslint-disable @typescript-eslint/no-unused-vars */
import ConfigurationLoader, {
    type ConfigurationLoadType,
} from '@lib/configuration/configuration.loader';
import path from 'path';
import { mergeConfig as mergeViteConfig } from 'vite';
import * as mergeWebpackConfig from 'webpack-merge';
import deepmerge from 'deepmerge';

const getMergeFunction = (options: ConfigOption) => {
    const { module } = options;
    switch (module) {
        case 'vite':
        case 'rollup':
            return mergeViteConfig as (
                base: Record<string, any>,
                config: Record<string, any>,
            ) => Record<string, any>;
        case 'webpack':
            return mergeWebpackConfig.merge as (
                base: Record<string, any>,
                config: Record<string, any>,
            ) => Record<string, any>;
        default:
            return deepmerge as (
                base: Record<string, any>,
                config: Record<string, any>,
            ) => Record<string, any>;
    }
};

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
export interface ConfigOption {
    module: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
    configPath?: string;
}

export interface BaseCompilerInterface<Config = Record<string, any>, BuildOutput = any> {
    build: (config: Config) => BuildOutput | Promise<BuildOutput>;
    createServer?: (config: Record<string, any>) => Promise<void | boolean>;
    closeServer?: () => void;
}

export abstract class Compiler<Config extends Record<string, any> = any, Server = any> {
    protected abstract server: Server;
    protected abstract configOption: ConfigOption;
    protected async getConfig() {
        const { module, configPath } = this.configOption;
        if (!module) {
            return {} as Config;
        }

        if (configPath && typeof module === 'string') {
            const dirname = path.dirname(configPath);
            const basename = path.basename(configPath);
            const configResult = await ConfigurationLoader.load(
                { module, searchPlaces: [basename] },
                dirname,
            );
            return configResult as Config;
        }
        const result = await ConfigurationLoader.load(module, configPath);
        return (result || {}) as Config;
    }
    protected async mergeConfig(baseConfig?: Config): Promise<Config> {
        const mergeConfig = createMergeConfig<Config>(this.configOption.module);
        const config = await this.getConfig();
        return baseConfig ? mergeConfig(config, baseConfig) : config;
    }
    protected createServer(baseConfig?: Config): Promise<void> | void {}
    protected closeServer(): Promise<void> | void {}
    protected build(baseConfig?: Config): Promise<void> | void {}
}
