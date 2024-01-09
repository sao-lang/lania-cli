import ConfigurationLoader, {
    ConfigurationLoadType,
} from '@lib/configuration/configuration.loader';
export interface ConfigOption {
    module: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
    configDir?: string;
}

export interface BaseCompilerInterface<Config = Record<string, any>, BuildOutput = any> {
    build: (config: Config) => BuildOutput | Promise<BuildOutput>;
    createServer: (config: Record<string, any>) => void | Promise<void>;
    closeServer: () => void;
}

export default class Compiler {
    private configOption: ConfigOption;
    private config: Record<string, any> = {};
    private baseCompiler: BaseCompilerInterface;
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
        const { module, configDir } = this.configOption;
        const config = await new ConfigurationLoader().load(module, configDir);
        return { ...this.config, ...config };
    }
    public async build(baseConfig: Record<string, any> = {}) {
        const config = await this.getConfig();
        await this.baseCompiler.build({ ...config, ...baseConfig });
    }
    public createServer() {}
    public closeServer() {}
}
