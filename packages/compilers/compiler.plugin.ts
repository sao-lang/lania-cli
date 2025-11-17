import { LogOnBuildRollupPluginOptions, LogOnBuildWebpackPluginOptions } from '@lania-cli/types';
import { styleText, logger } from '@lania-cli/common';
import path from 'path';
import type { PluginOption } from 'vite';
import type { Compiler, StatsError } from 'webpack';
const logWebpackErrors = (errors: StatsError[], isWarning: boolean = false) => {
    errors.forEach(({ moduleIdentifier, message }) => {
        if (moduleIdentifier) {
            const filenameModifiedText = styleText(moduleIdentifier.replace(/\\/g, '/'), {
                color: '#28b8db',
            }).render();
            logger.log(`file: ${filenameModifiedText}`, { style: { bold: true } });
            logger.warn(message);
        }
        if (!isWarning) {
            logger.error(message);
            process.exit(0);
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
            await options.onWriteBundle?.(outputOptions, bundle as any);
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
