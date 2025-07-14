import { ConfigurationLoadType } from '../shared';
import type { NormalizedOutputOptions, OutputBundle } from 'rollup';
import type { Compiler, Stats } from 'webpack';

export interface ConfigOption {
    module: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
    configPath?: string;
}

export interface BaseCompilerInterface<Config = Record<string, any>, BuildOutput = any> {
    build: (config: Config) => BuildOutput | Promise<BuildOutput>;
    createServer?: (config: Record<string, any>) => Promise<void | boolean>;
    closeServer?: () => void;
}
export interface LogOnBuildWebpackPluginOptions {
    onDone?: (stats: Stats) => void;
    onWatch?: (compiler: Compiler) => void;
    onBeforeRun?: (compiler: Compiler) => void;
}
export interface LogOnBuildRollupPluginOptions {
    onBuildEnd?: () => void | Promise<void>;
    onWriteBundleEnd?: () => void | Promise<void>;
    onWriteBundle?: (
        options: NormalizedOutputOptions,
        bundle: OutputBundle,
    ) => void | Promise<void>;
    onBuildStart?: () => void | Promise<void>;
}
