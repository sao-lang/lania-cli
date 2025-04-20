import { Compiler } from './compiler.base';
import logger from '@utils/logger';
import text from '@utils/text';
import path from 'path';
import webpack, { type Configuration, type StatsAsset } from 'webpack';
import DevServer from 'webpack-dev-server';
import { logOnBuildWebpackPlugin } from './compiler.plugin';
import to from '@utils/to';
import { ConfigOption } from '@lania-cli/types';

export default class WebpackCompiler extends Compiler<Configuration, DevServer> {
    protected server: DevServer;
    protected configOption: ConfigOption;

    constructor(configPath?: string) {
        super();
        this.configOption = { module: 'webpack', configPath };
    }

    public async createServer(baseConfig?: Configuration): Promise<void> {
        await this.closeServer();
        return new Promise(async (resolve, reject) => {
            const config = await this.mergeConfig(baseConfig);
            const configuration = await this.mergeStatsConfig(config);
            const compiler = webpack(configuration);
            this.server = new DevServer(configuration.devServer, compiler);
            this.registerPlugin(compiler, resolve, {
                watch: configuration.watch,
                mode: configuration.mode,
                isInBuild: true,
            });
            const [createServerErr] = await to(this.server.start());
            if (createServerErr) {
                logger.error(`Create server failed: ${createServerErr.message}`);
                return reject();
            }
        });
    }
    public closeServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.server?.close?.();
                resolve();
            } catch (e) {
                reject();
                throw e;
            }
        });
    }
    public async build(baseConfig?: Configuration): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const config = await this.mergeConfig(baseConfig);
                const configuration = await this.mergeStatsConfig(config);
                const compiler = webpack(configuration, () => {});
                this.registerPlugin(compiler, resolve, {
                    watch: configuration.watch,
                    mode: configuration.mode,
                    isInBuild: true,
                });
            } catch (e) {
                logger.error(`Build failed: ${e.message}`);
                reject();
            }
        });
    }
    private mergeStatsConfig(config: Configuration) {
        return { ...config, stats: 'none' } as Configuration;
    }
    private registerPlugin(
        compiler: webpack.Compiler,
        resolve: () => void,
        { isInBuild, watch, mode }: { isInBuild: boolean; watch: boolean; mode: string },
    ) {
        logOnBuildWebpackPlugin(compiler, {
            onDone: (stats) => {
                const { time, version, assets, outputPath } = stats.toJson();
                if (!watch) {
                    this.logBundles(assets, outputPath);
                    const versionModifiedText = text(`webpack v${version}`, {
                        color: '#1da8cd',
                    });
                    const modeModifiedText = text(`build for ${mode || 'development'}`, {
                        color: '#21a579',
                    });
                    logger.info(`[Webpack] ${versionModifiedText} ${modeModifiedText}`);
                    logger.success(`[Webpack] built in ${time / 1000}s`);
                }
                if (watch) {
                    logger.info('[Webpack] Watching for file changing!');
                }
                resolve();
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
                if (watch) {
                    logger.info('[Webpack] Watching for file changing!');
                }
            },
        });
    }
    private logBundles(assets: StatsAsset[], outputPath: string) {
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
    }
}
