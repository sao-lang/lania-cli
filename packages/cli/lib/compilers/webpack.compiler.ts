import Compiler, { type BaseCompilerInterface } from './compiler.base';
import logger from '@utils/logger';
import text from '@utils/text';
import path from 'path';
import webpack, { type Configuration, type StatsAsset } from 'webpack';
import DevServer from 'webpack-dev-server';
import { logOnBuildWebpackPlugin } from './compiler.plugin';
import type { CompilerBaseConfigOption } from '@utils/types';

export const logWebpackBundles = (assets: StatsAsset[], outputPath: string) => {
    assets.forEach(({ name, size }) => {
        const filename = `${path.basename(outputPath)}/${name}`;
        const fileSize = (size / 1024).toFixed(2);
        const filenameModifiedText = text(`${filename}`, { color: '#6a7c80' });
        const fileSizeModifiedText = text(`${fileSize}K`, {
            bold: true,
            color: '#7a7c80',
        });
        logger.info(`[Webpack] ${filenameModifiedText} ${fileSizeModifiedText}`);
    });
};

export default class WebpackCompiler extends Compiler<Configuration> {
    private server: DevServer | null;
    constructor(configOption?: CompilerBaseConfigOption, config?: Configuration) {
        const baseCompiler: BaseCompilerInterface = {
            build: (config: Configuration = {}) => this.buildHandler(config),
            createServer: (config: Configuration = {}) => this.createServerHandler(config),
            closeServer: async () => this.closeServerHandler(),
        };
        const { module = 'webpack', configPath } = configOption || {};
        super(baseCompiler, { module, configPath }, config);
    }

    private createServerHandler(config: Configuration = {}) {
        this.closeServer();
        return new Promise((resolve: (res: boolean) => void) => {
            const finalConfig = this.mergeConfig(config);
            const compiler = webpack(finalConfig);
            this.server = new DevServer(finalConfig.devServer, compiler);
            this.registerPlugin(compiler, finalConfig, resolve, false);
            this.server
                .start()
                .then(() => {
                    resolve(true);
                })
                .catch((err) => {
                    logger.error(err.message, true);
                });
        });
    }

    private buildHandler(config: Configuration = {}) {
        return new Promise((resolve: (res: boolean) => void) => {
            const finalConfig = this.mergeConfig(config);
            const compiler = webpack(finalConfig, () => {});
            this.registerPlugin(compiler, finalConfig, resolve);
        });
    }

    private closeServerHandler() {
        this.server?.close?.();
    }

    private registerPlugin(
        compiler: webpack.Compiler,
        config: Configuration = {},
        resolve: (res: boolean) => void,
        isInBuild: boolean = true,
    ) {
        logOnBuildWebpackPlugin(compiler, {
            onDone: (stats) => {
                const { time, version, assets, outputPath } = stats.toJson();
                if (!config.watch) {
                    logWebpackBundles(assets, outputPath);
                    const versionModifiedText = text(`webpack v${version}`, {
                        color: '#1da8cd',
                    });
                    const modeModifiedText = text(`build for ${config.mode || 'development'}`, {
                        color: '#21a579',
                    });
                    logger.info(`[Webpack] ${versionModifiedText} ${modeModifiedText}`);
                    logger.success(`[Webpack] built in ${time / 1000}s`);
                }
                if (config.watch) {
                    logger.info('[Webpack] Watching for file changing!');
                }
                resolve(true);
            },
            onWatch: ({ modifiedFiles }) => {
                if (modifiedFiles) {
                    modifiedFiles.forEach((file) => {
                        const dirname = path.dirname(file);
                        if (['.history', 'node_modules'].some((dir) => dirname.includes(dir))) {
                            return;
                        }
                        logger.log(`[Webpack] ${file} changed`);
                    });
                }
            },
            onBeforeRun: () => {
                if (!isInBuild) {
                    return;
                }
                if (config.watch) {
                    logger.info('[Webpack] Watching for file changing!');
                }
            },
        });
    }

    private mergeConfig(config: Configuration) {
        return { ...config, stats: 'none' } as Configuration;
        // return { ...config } as Configuration;
    }
}
