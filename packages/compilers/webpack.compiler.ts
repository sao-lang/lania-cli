import { Compiler } from './compiler.base';
import path from 'path';
import os from 'os';
import webpack, { type Configuration, type StatsAsset } from 'webpack';
import DevServer from 'webpack-dev-server';
import { logOnBuildWebpackPlugin } from './compiler.plugin';
import { to, styleText, logger } from '@lania-cli/common';
import { CompilerHandleOptions, ConfigOption } from '@lania-cli/types';

export class WebpackCompiler extends Compiler<Configuration, DevServer, typeof webpack> {
    protected server!: DevServer;
    protected configOption: ConfigOption;
    private devServer: typeof DevServer;

    constructor(configPath?: string, options?: CompilerHandleOptions) {
        super(options?.outerCompiler?.webpack ?? webpack, { module: 'webpack', configPath });
        this.devServer = options?.outerCompiler?.webpackDevServer ?? DevServer;
    }

    public async createServer(baseConfig?: Configuration): Promise<void> {
        await this.closeServer();
        return new Promise(async (resolve, reject) => {
            try {
                const config = await this.mergeBaseConfig(baseConfig);
                const configuration = await this.overrideStatsConfig(config);
                const compiler = this.base(configuration);
                this.server = new this.devServer(configuration.devServer, compiler);
                this.registerPlugin(compiler, resolve, {
                    watch: !!configuration.watch,
                    mode: configuration.mode,
                    isInBuild: true,
                });
                const [createServerErr] = await to(this.server.start());
                if (createServerErr) {
                    logger.error(`Create server failed: ${createServerErr.message}`);
                    return reject(createServerErr);
                }
            } catch (e: any) {
                logger.error(`Create server failed: ${e?.message || e}`);
                reject(e);
            }
        });
    }

    public closeServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.server?.close?.();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    public async build(baseConfig?: Configuration): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const config = await this.mergeBaseConfig(baseConfig);
                const configuration = await this.overrideStatsConfig(config);
                const compiler = this.base(configuration, () => {});
                this.registerPlugin(compiler, resolve, {
                    watch: !!configuration.watch,
                    mode: configuration.mode,
                    isInBuild: true,
                });
            } catch (e: any) {
                logger.error(`Build failed: ${e?.message || e}`);
                reject(e);
            }
        });
    }

    private overrideStatsConfig(config: Configuration) {
        return {
            ...config,
            stats: 'none',
            devServer: {
                ...(config.devServer ?? {}),
                devMiddleware: {
                    stats: 'none',
                },
                setupMiddlewares: (middlewares, devServer) => {
                    if (devServer) {
                        devServer.logger.info = () => {};
                        devServer.logger.log = () => {};
                        devServer.logger.warn = () => {};
                    }
                    return middlewares;
                },
            },
        } as Configuration;
    }

    private registerPlugin(
        compiler: webpack.Compiler,
        resolve: () => void,
        { isInBuild, watch, mode }: { isInBuild: boolean; watch: boolean; mode?: string },
    ) {
        logOnBuildWebpackPlugin(compiler, {
            onDone: (stats) => {
                const { time, version, assets, outputPath } = stats.toJson();
                if (!watch) {
                    this.logBundles(assets, outputPath);
                    const versionModifiedText = styleText(`webpack v${version}`, {
                        color: '#1da8cd',
                    }).render();
                    const modeModifiedText = styleText(`build for ${mode || 'development'}`, {
                        color: '#21a579',
                    }).render();
                    logger.info(`[Webpack] ${versionModifiedText} ${modeModifiedText}`);
                    logger.success(`[Webpack] built in ${time / 1000}s`);
                }
                if (watch) {
                    logger.info('[Webpack] Watching for file changing!');
                }
                this.server && this.printUrls(this.server);
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
            const filenameModifiedText = styleText(`${filename}`, { color: '#6a7c80' }).render();
            const fileSizeModifiedText = styleText(`${fileSize}K`, {
                bold: true,
                color: '#7a7c80',
            }).render();
            logger.info(`[Webpack] ${filenameModifiedText} ${fileSizeModifiedText}`);
        });
    }

    private printUrls(server: DevServer) {
        try {
            const options: any = (server as any).options || {};
            const isHttps = !!options.https;
            const protocol = isHttps ? 'https' : 'http';
            const host = options.host || 'localhost';
            const port: number | string =
                options.port || (server as any)?.server?.address?.()?.port || 'unknown';

            const addresses: string[] = [];
            if (host === '0.0.0.0' || host === '::') {
                const nets = os.networkInterfaces();
                for (const name of Object.keys(nets)) {
                    for (const net of nets[name]!) {
                        if (net.family === 'IPv4' && !net.internal) {
                            addresses.push(`${protocol}://${net.address}:${port}`);
                        }
                    }
                }
                addresses.unshift(`${protocol}://localhost:${port}`);
            } else {
                addresses.push(`${protocol}://${host}:${port}`);
            }

            if (addresses.length === 1) {
                logger.success(`[DevServer] running at ${addresses[0]}`);
            } else {
                logger.success('[DevServer] running at:');
                addresses.forEach((addr) => {
                    logger.success(`  ${addr}`);
                });
            }
        } catch (e) {
            logger.warn('[DevServer] failed to resolve server address');
        }
    }
}

export default WebpackCompiler;
