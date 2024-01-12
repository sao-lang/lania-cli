import ConfigurationLoader, {
    type ConfigurationLoadType,
} from '@lib/configuration/configuration.loader';
import path from 'path';
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
        option: ConfigOption,
        config: Record<string, any> = {},
    ) {
        this.baseCompiler = baseCompiler;
        this.configOption = option;
        this.config = { ...config };
    }
    private async getConfig() {
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
        const config = await this.getConfig();
        return await this.baseCompiler.build({ ...(baseConfig || {}), ...config } as Config);
    }
    public async createServer(baseConfig?: Config) {
        const config = await this.getConfig();
        await this.baseCompiler?.createServer({ ...(baseConfig || {}), ...config } as Config);
    }
    public async closeServer() {
        await this.baseCompiler?.closeServer();
    }
}
