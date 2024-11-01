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

const createMergeConfig = (module: ConfigOption['module']) => {
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
export interface ConfigOption {
    module: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
    configPath?: string;
}

export interface BaseCompilerInterface<Config = Record<string, any>, BuildOutput = any> {
    build: (config: Config) => BuildOutput | Promise<BuildOutput>;
    createServer?: (config: Record<string, any>) => Promise<void | boolean>;
    closeServer?: () => void;
}

export abstract class BaseCompiler<Config = Record<string, any>> {
    protected abstract configOption: ConfigOption;
    protected async getConfig() {
        const { module, configPath } = this.configOption;
        if (!module) return {};

        if (configPath && typeof module === 'string') {
            const dirname = path.dirname(configPath);
            const basename = path.basename(configPath);
            const configResult = await new ConfigurationLoader().load(
                { module, searchPlaces: [basename] },
                dirname,
            );
            return configResult;
        }
        return (await new ConfigurationLoader().load(module, configPath)) || {};
    }
    protected async mergeConfig(baseConfig?: Config) {
        const mergeConfig = createMergeConfig(this.configOption.module);
        const config = await this.getConfig();
        return baseConfig ? mergeConfig(config, baseConfig) : config;
    }
    abstract createServer(baseConfig?: Config): Promise<void>;
    abstract closeServer(): Promise<void>;
    abstract build(baseConfig?: Config): Promise<void>;
}

export default class Compiler<Config = any> {
    private configOption: ConfigOption;
    private config: Record<string, any> = {};
    private baseCompiler: BaseCompilerInterface<Config>;

    constructor(
        baseCompiler: BaseCompilerInterface,
        option?: ConfigOption,
        config: Record<string, any> = {},
    ) {
        this.baseCompiler = baseCompiler;
        this.configOption = option || { module: 'vite' }; // Use a valid default value
        this.config = config;
    }

    private async getConfig() {
        const { module, configPath } = this.configOption;
        if (!module) return this.config;

        if (configPath && typeof module === 'string') {
            const dirname = path.dirname(configPath);
            const basename = path.basename(configPath);
            const configResult = await new ConfigurationLoader().load(
                { module, searchPlaces: [basename] },
                dirname,
            );
            return { ...configResult, ...this.config };
        }

        return (await new ConfigurationLoader().load(module, configPath)) || {};
    }

    public async build(baseConfig?: Config) {
        const mergeConfig = getMergeFunction(this.configOption);
        const config = await this.getConfig();
        const finalConfig = baseConfig ? mergeConfig(config, baseConfig as any) : config;
        return await this.baseCompiler.build(finalConfig as Config);
    }

    public async createServer(baseConfig?: Config) {
        const mergeConfig = getMergeFunction(this.configOption);
        const config = await this.getConfig();
        const finalConfig = baseConfig ? mergeConfig(baseConfig as any, config) : config;
        return await this.baseCompiler.createServer(finalConfig);
    }

    public async closeServer() {
        await this.baseCompiler.closeServer?.();
    }
}
