import {
    type InlineConfig,
    build,
    createServer,
    type ViteDevServer,
    createLogger,
    mergeConfig,
} from 'vite';
import Compiler, { type BaseCompilerInterface } from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';
import logger from '@utils/logger';
import path from 'path';
import fs from 'fs';
import to from '@utils/to';
import text from '@utils/text';
import loading from '@utils/loading';
import { type OutputBundle } from 'rollup';
import { LogOnBuildRollupPluginOptions, logOnBuildRollupPlugin } from './compiler.plugin';

const customLogger = createLogger();
customLogger.error = () => {};
customLogger.warn = () => {};
customLogger.info = () => {};
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

const pluginConfigOption = {
    config(config) {
        return mergeConfig(config, {
            logLevel: 'silent',
            customLogger,
        });
    },
};
export default class ViteCompiler extends Compiler<InlineConfig> {
    constructor(
        configOption?: {
            module?: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
            configPath?: string;
        },
        config?: InlineConfig,
    ) {
        let server: ViteDevServer | null;
        const prevDate = new Date().getTime();
        const baseCompiler: BaseCompilerInterface<InlineConfig> = {
            build: async (config: InlineConfig = {}) => {
                const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
                    onWriteBundleEnd: () => {
                        if (!configuration.build.watch) {
                            const now = new Date().getTime();
                            logger.log(`built in ${(now - prevDate) / 1000}s`, {
                                color: '#21a579',
                            });
                        }
                    },
                    onWriteBundle: async ({ dir }, bundle) => {
                        if (!configuration.build.watch) {
                            await logViteBundle(dir, bundle);
                        }
                    },
                    onBuildStart: () => {
                        if (configuration.build.watch) {
                            logger.log('Watching for file changing!');
                        }
                    },
                };
                const configuration: InlineConfig = mergeConfig(
                    {
                        plugins: [
                            {
                                ...logOnBuildRollupPlugin(logOnBuildOptions),
                                ...pluginConfigOption,
                            },
                        ],
                    } as InlineConfig,
                    config,
                );
                const output = await build(configuration);

                return output;
            },
            async createServer(this: typeof baseCompiler, config: InlineConfig = {}) {
                await this.closeServer();
                const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
                    onBuildStart: () => {
                        if (server) {
                            logger.log('Watching for file changing!');
                        }
                    },
                };
                const configuration = mergeConfig(
                    {
                        plugins: [
                            { ...logOnBuildRollupPlugin(logOnBuildOptions), ...pluginConfigOption },
                        ],
                    },
                    config,
                );
                server = await createServer(configuration);
                await server.listen();
                server.printUrls();
            },
            closeServer: async () => {
                if (server) {
                    await await server.close();
                }
            },
        };
        const { module, configPath } = configOption || {};
        super(
            baseCompiler,
            !module ? { module: 'vite', configPath } : { module, configPath },
            config,
        );
    }
}
