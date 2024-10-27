import {
    type InlineConfig,
    build,
    createServer,
    type ViteDevServer,
    createLogger,
    mergeConfig,
} from 'vite';
import Compiler from './compiler.base';
import logger from '@utils/logger';
import path from 'path';
import fs from 'fs';
import to from '@utils/to';
import text from '@utils/text';
import { type OutputBundle } from 'rollup';
import { LogOnBuildRollupPluginOptions, logOnBuildRollupPlugin } from './compiler.plugin';
import { CompilerBaseConfigOption } from '@utils/types';

export default class ViteCompiler extends Compiler<InlineConfig> {
    private server: ViteDevServer | null = null;

    constructor(configOption?: CompilerBaseConfigOption, config?: InlineConfig) {
        const baseCompiler = {
            build: async (config: InlineConfig = {}) => this.buildHandler(config),
            createServer: async (config: InlineConfig = {}) => this.createServerHandler(config),
            closeServer: async () => this.closeServerHandler(),
        };
        const { module = 'vite', configPath } = configOption || {};
        super(baseCompiler, { module, configPath }, config);
    }

    private async buildHandler(config: InlineConfig = {}) {
        const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
            onWriteBundleEnd: () => logger.success('Build completed.'),
            onWriteBundle: async ({ dir }, bundle) => {
                await this.logViteBundle(dir, bundle);
            },
            onBuildStart: () => logger.info('Build started...'),
        };

        const configuration = this.mergeWithPluginOptions(config, logOnBuildOptions);
        const [buildErr, buildRes] = await to(build(configuration));
        if (buildErr) {
            logger.error(`Build failed: ${buildErr.message}`);
            throw buildErr;
        }
        return buildRes;
    }

    private async createServerHandler(config: InlineConfig = {}) {
        await this.closeServer();

        const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
            onBuildStart: () => logger.info('Server is watching for file changes...'),
        };

        const configuration = this.mergeWithPluginOptions(config, logOnBuildOptions);
        this.server = await createServer(configuration);
        await this.server.listen();
        this.server.printUrls();
    }

    private async closeServerHandler() {
        if (this.server) {
            await this.server.close();
            this.server = null;
            logger.success('Vite server closed.');
        }
    }

    private async logViteBundle(dir: string, bundle: OutputBundle) {
        const bundleEntries = Object.keys(bundle).map(async (key) => {
            const { fileName } = bundle[key];
            const [error, stats] = await to(fs.promises.stat(`${dir}/${fileName}`));
            if (error) {
                logger.error(`Failed to log bundle: ${error.message}`);
                return;
            }
            const name = `${path.basename(dir)}/${fileName}`;
            const size = (stats.size / 1024).toFixed(2) + 'K';
            logger.info(
                `${text(name, { color: '#6a7c80' })} ${text(size, {
                    bold: true,
                    color: '#7a7c80',
                })}`,
            );
        });

        await Promise.all(bundleEntries);
    }

    private mergeWithPluginOptions(
        config: InlineConfig,
        logOnBuildOptions: LogOnBuildRollupPluginOptions,
    ) {
        return mergeConfig(
            {
                logLevel: 'silent',
                plugins: [
                    logOnBuildRollupPlugin(logOnBuildOptions),
                    {
                        config: (currentConfig) =>
                            mergeConfig(currentConfig, { customLogger: this.createViteLogger() }),
                    },
                ],
            },
            config,
        ) as InlineConfig;
    }

    private createViteLogger() {
        const customLogger = createLogger();
        customLogger.error = (msg) => logger.error(`[Vite] ${msg}`);
        customLogger.warn = (msg) => logger.warning(`[Vite] ${msg}`);
        customLogger.info = (msg) => logger.info(`[Vite] ${msg}`);
        return customLogger;
    }
}
