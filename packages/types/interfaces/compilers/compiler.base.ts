import { ConfigurationLoadType } from '../configuration/configuration.loader';

export interface ConfigOption {
    module: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
    configPath?: string;
}

export interface BaseCompilerInterface<Config = Record<string, any>, BuildOutput = any> {
    build: (config: Config) => BuildOutput | Promise<BuildOutput>;
    createServer?: (config: Record<string, any>) => Promise<void | boolean>;
    closeServer?: () => void;
}
