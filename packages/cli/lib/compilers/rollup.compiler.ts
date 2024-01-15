import text from '@utils/text';
import Compiler, { type BaseCompilerInterface } from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';
import to from '@utils/to';
import fs from 'fs';
import path from 'path';

import { type RollupOptions, rollup, OutputBundle, Plugin, NormalizedOutputOptions } from 'rollup';
import logger from '@utils/logger';
import { mergeConfig } from 'vite';

interface LogOnBuildOptions {
    onBuildEnd?: () => void | Promise<void>;
    onWriteBundleEnd?: () => void | Promise<void>;
    onWriteBundle?: (
        options: NormalizedOutputOptions,
        bundle: OutputBundle,
    ) => void | Promise<void>;
    onBuildStart?: () => void | Promise<void>;
}

const logViteBundle = async (dir: string, bundle: OutputBundle) => {
    for (const key of Object.keys(bundle)) {
        const { fileName } = bundle[key];
        const [error, stats] = await to(fs.promises.stat(`${dir}/${fileName}`));
        if (!error) {
            const name = `${path.basename(dir)}/${fileName}`;
            const size = (stats.size / 1024).toFixed(2) + 'K';
            const nameModifiedText = text(name, {
                color: '#6a7c80',
            });
            const sizeModifiedText = text(size, {
                bold: true,
                color: '#7a7c80',
            });
            logger.log(`${nameModifiedText} ${sizeModifiedText}`);
        } else {
            logger.error(error.message);
        }
    }
};

const logOnBuild = (options?: LogOnBuildOptions): Plugin => {
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

export default class RollupCompiler extends Compiler<RollupOptions> {
    constructor(
        configOption?: {
            module?: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
            configPath?: string;
        },
        config?: RollupOptions,
    ) {
        const baseCompiler: BaseCompilerInterface<RollupOptions> = {
            build: async (config: RollupOptions = {}) => {
                const prevDate = new Date().getTime();
                const logOnBuildOptions: LogOnBuildOptions = {
                    onWriteBundleEnd: () => {
                        if (!configuration.watch) {
                            const now = new Date().getTime();
                            logger.log(`built in ${(now - prevDate) / 1000}s`, {
                                color: '#21a579',
                            });
                        }
                    },
                    onWriteBundle: async ({ dir }, bundle) => {
                        if (!configuration.watch) {
                            await logViteBundle(dir, bundle);
                        }
                    },
                    onBuildStart: () => {
                        if (configuration.watch) {
                            logger.log('Watching for file changing!');
                        }
                    },
                };

                const configuration: RollupOptions = mergeConfig(
                    { plugins: [logOnBuild(logOnBuildOptions)] },
                    config,
                );
                const output = await rollup(configuration);
                return output;
            },
        };
        const { module, configPath } = configOption || {};
        super(
            baseCompiler,
            !module ? { module: 'rollup', configPath } : { module, configPath },
            config,
        );
    }
}
