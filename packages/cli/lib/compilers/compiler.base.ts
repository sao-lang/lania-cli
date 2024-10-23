import ConfigurationLoader, {
    type ConfigurationLoadType,
} from '@lib/configuration/configuration.loader';
import path from 'path';
import { mergeConfig as mergeViteConfig } from 'vite';
import mergeWebpackConfig from 'webpack-merge';
import deepmerge from 'deepmerge';

const getMerge = (options: ConfigOption) => {
    const { module } = options.module as { module: string; searchPlaces?: string[] };
    if (['vite', 'rollup'].includes(module)) {
        return mergeViteConfig as any;
    }
    if (module === 'webpack') {
        return mergeWebpackConfig as any;
    }
    return deepmerge as any;
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
        this.configOption = option;
        this.config = { ...config };
    }
    private async getConfig() {
        if (!this.configOption) {
            return {};
        }
        const { module, configPath } = this.configOption || {};
        if (!module) {
            return this.config;
        }
        if (configPath && typeof module === 'string') {
            const dirname = path.dirname(configPath);
            const basename = path.basename(configPath);
            const configResult = await new ConfigurationLoader().load(
                { module, searchPlaces: [basename] },
                dirname,
            );
            return { ...configResult, ...this.config };
        }
        const configResult = await new ConfigurationLoader().load(module, configPath);
        return configResult;
    }
    public async build(baseConfig?: Config) {
        const mergeConfig = getMerge(this.configOption);
        const config = await this.getConfig();
        return await this.baseCompiler.build(
            (baseConfig ? mergeConfig(baseConfig as any, config) : config) as Config,
        );
    }
    public async createServer(baseConfig?: Config) {
        const mergeConfig = getMerge(this.configOption);
        const config = await this.getConfig();
        console.log({ config });
        await this.baseCompiler?.createServer(
            (baseConfig ? mergeConfig(baseConfig as any, config) : config) as Config,
        );
    }
    public async closeServer() {
        await this.baseCompiler?.closeServer();
    }
}
