import logger from '@utils/logger';
import text from '@utils/text';
import path from 'path';
import { NormalizedOutputOptions, OutputBundle } from 'rollup';
import { PluginOption } from 'vite';
import { Compiler, Stats, StatsError } from 'webpack';
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
const logWebpackErrors = (errors: StatsError[], isWarning: boolean = false) => {
    errors.forEach(({ moduleIdentifier, message }, index) => {
        if (moduleIdentifier) {
            const filenameModifiedText = text(moduleIdentifier.replace(/\\/g, '/'), {
                color: '#28b8db',
            });
            logger.bold(`file: ${filenameModifiedText}`);
            logger.warning(message);
        }
        if (!isWarning) {
            logger.error(message, index === errors.length - 1);
        }
    });
};

export const logOnBuildWebpackPlugin = (
    compiler: Compiler,
    options?: LogOnBuildWebpackPluginOptions,
) => {
    const name = 'logOnBuild';
    compiler.hooks.watchRun.tap(name, (watcher) => {
        options.onWatch?.(watcher);
    });
    compiler.hooks.failed.tap(name, (err) => {
        logger.error(err.message);
    });
    compiler.hooks.beforeRun.tap(name, (compiler) => {
        options.onBeforeRun?.(compiler);
    });
    compiler.hooks.done.tap(name, (stats) => {
        const { errors, warnings } = stats.toJson();
        if (warnings) {
            logWebpackErrors(warnings, true);
        }
        if (errors) {
            logWebpackErrors(errors);
        }
        options.onDone?.(stats);
    });
};

export const logOnBuildRollupPlugin = (options?: LogOnBuildRollupPluginOptions): PluginOption => {
    return {
        name: 'logOnBuild',
        async buildStart() {
            await options.onBuildStart?.();
        },
        async buildEnd(error) {
            if (error) {
                logger.error(error.message);
                return;
            }
            await options.onBuildEnd?.();
        },
        async writeBundle(outputOptions, bundle) {
            await options.onWriteBundle?.(outputOptions, bundle);
            await options.onWriteBundleEnd?.();
        },
        watchChange(id) {
            const dirname = path.dirname(id);
            if (['.history', 'node_modules'].some((dir) => dirname.includes(dir))) {
                return;
            }
            logger.log(`${id} changed`);
        },
    };
};
