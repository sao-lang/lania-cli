import Compiler, { type BaseCompilerInterface } from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';
import logger from '@utils/logger';
import text from '@utils/text';
import path from 'path';
import webpack, {
    type StatsError,
    type Configuration,
    type StatsAsset,
    type Stats,
    type Compiler as WebpackOriCompiler,
} from 'webpack';
import DevServer from 'webpack-dev-server';

interface LogOnBuildOptions {
    onDone?: (stats: Stats) => void;
    onWatch?: (compiler: WebpackOriCompiler) => void;
    onBeforeRun?: (compiler: WebpackOriCompiler) => void;
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

const logWebpackBundles = (assets: StatsAsset[], outputPath: string) => {
    assets.forEach(({ name, size }) => {
        const filename = `${path.basename(outputPath)}/${name}`;
        const fileSize = (size / 1024).toFixed(2);
        const filenameModifiedText = text(`${filename}`, { color: '#6a7c80' });
        const fileSizeModifiedText = text(`${fileSize}K`, {
            bold: true,
            color: '#7a7c80',
        });
        logger.log(`${filenameModifiedText}  ${fileSizeModifiedText}`);
    });
};

const logOnBuild = (compiler: WebpackOriCompiler, options?: LogOnBuildOptions) => {
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

export default class WebpackCompiler extends Compiler<Configuration> {
    constructor(
        configOption?: {
            module?: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
            configPath?: string;
        },
        config?: Configuration,
    ) {
        let server: DevServer | null;
        const baseCompiler: BaseCompilerInterface = {
            build: (config: Configuration = {}) => {
                return new Promise((resolve) => {
                    const compiler = webpack(config, () => {});
                    logOnBuild(compiler, {
                        onDone: (stats) => {
                            const { time, version, assets, outputPath } = stats.toJson();
                            if (!config.watch) {
                                logWebpackBundles(assets, outputPath);
                                const versionModifiedText = text(`webpack v${version}`, {
                                    color: '#1da8cd',
                                });
                                const modeModifiedText = text(
                                    `build for ${config.mode || 'development'}`,
                                    { color: '#21a579' },
                                );
                                logger.log(`${versionModifiedText} ${modeModifiedText}`);
                                logger.log(`built in ${time / 1000}s`, { color: '#21a579' });
                            }
                            if (config.watch) {
                                logger.log('Watching for file changing!');
                            }
                            resolve(true);
                        },
                        onWatch: ({ modifiedFiles }) => {
                            if (modifiedFiles) {
                                const files = [...modifiedFiles];
                                files.forEach((file) => {
                                    const dirname = path.dirname(file);
                                    if (
                                        ['.history', 'node_modules'].some((dir) =>
                                            dirname.includes(dir),
                                        )
                                    ) {
                                        return;
                                    }
                                    logger.log(`${file} changed`);
                                });
                            }
                        },
                        onBeforeRun: () => {
                            if (config.watch) {
                                logger.log('Watching for file changing!');
                            }
                        },
                    });
                });
            },
            createServer(this: typeof baseCompiler, config: Configuration = {}) {
                this.closeServer();
                return new Promise((resolve) => {
                    const compiler = webpack(config);
                    server = new DevServer(config.devServer, compiler);
                    logOnBuild(compiler, {
                        onDone: (stats) => {
                            const { time, version, assets, outputPath } = stats.toJson();
                            if (!config.watch) {
                                logWebpackBundles(assets, outputPath);
                                const versionModifiedText = text(`webpack v${version}`, {
                                    color: '#1da8cd',
                                });
                                const modeModifiedText = text(
                                    `build for ${config.mode || 'development'}`,
                                    { color: '#21a579' },
                                );
                                logger.log(`${versionModifiedText} ${modeModifiedText}`);
                                logger.log(`built in ${time / 1000}s`, { color: '#21a579' });
                            }
                            if (config.watch) {
                                logger.log('Watching for file changing!');
                            }
                            resolve(true);
                        },
                        onWatch: ({ modifiedFiles }) => {
                            if (modifiedFiles) {
                                const files = [...modifiedFiles];
                                files.forEach((file) => {
                                    const dirname = path.dirname(file);
                                    if (
                                        ['.history', 'node_modules'].some((dir) =>
                                            dirname.includes(dir),
                                        )
                                    ) {
                                        return;
                                    }
                                    logger.log(`${file} changed`);
                                });
                            }
                        },
                    });
                    server
                        .start()
                        .then(() => {
                            resolve(true);
                        })
                        .catch((err) => {
                            logger.error(err.message, true);
                        });
                });
            },
            closeServer: async () => {
                if (server) {
                    server.close();
                }
            },
        };
        const { module, configPath } = configOption || {};
        super(
            baseCompiler,
            !module ? { module: 'webpack', configPath } : { module, configPath },
            config,
        );
    }
}
