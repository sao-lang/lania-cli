import type { NormalizedOutputOptions, OutputBundle } from 'rollup';
import type { Compiler, Stats } from 'webpack';
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
