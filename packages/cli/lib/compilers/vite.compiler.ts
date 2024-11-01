import { build, createServer, createLogger, mergeConfig } from 'vite';
import type { ViteDevServer, InlineConfig } from 'vite';
import { BaseCompiler, ConfigOption } from './compiler.base';
import logger from '@utils/logger';
import path from 'path';
import fs from 'fs';
import to from '@utils/to';
import text from '@utils/text';
import type { OutputBundle } from 'rollup';
import { LogOnBuildRollupPluginOptions, logOnBuildRollupPlugin } from './compiler.plugin';

export default class ViteCompiler extends BaseCompiler<InlineConfig> {
    protected configOption: ConfigOption;
    private server: ViteDevServer;
    constructor(configPath?: string) {
        super();
        this.configOption = { module: 'vite', configPath };
    }
    public async createServer(config?: InlineConfig) {
        await this.closeServer();
        const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
            onBuildStart: () => logger.info('Server is watching for file changes...'),
        };
        const configuration = await this.mergeConfig(
            this.mergeWithPluginOptions(config, logOnBuildOptions),
        );
        this.server = await createServer(configuration);
        await this.server.listen();
        this.server.printUrls();
    }
    public async closeServer() {
        if (this.server) {
            await this.server.close();
        }
    }
    public async build(config?: InlineConfig) {
        const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
            onWriteBundleEnd: () => logger.success('Build completed.'),
            onWriteBundle: async ({ dir }, bundle) => {
                await this.logViteBundle(dir, bundle);
            },
            onBuildStart: () => logger.info('Build started...'),
        };
        const configuration = await this.mergeConfig(
            this.mergeWithPluginOptions(config, logOnBuildOptions),
        );
        const [buildErr] = await to(build(configuration));
        if (buildErr) {
            logger.error(`Build failed: ${buildErr.message}`);
            throw buildErr;
        }
    }

    private mergeWithPluginOptions(
        config: InlineConfig,
        logOnBuildOptions: LogOnBuildRollupPluginOptions,
    ) {
        const configHook = (currentConfig: InlineConfig) => {
            return mergeConfig(currentConfig, { customLogger: this.createViteLogger() });
        };
        const plugins = [logOnBuildRollupPlugin(logOnBuildOptions), { config: configHook }];
        return mergeConfig({ logLevel: 'silent', plugins }, config);
    }

    private createViteLogger() {
        const customLogger = createLogger();
        customLogger.error = (msg) => logger.error(`[Vite] ${msg}`);
        customLogger.warn = (msg) => logger.warning(`[Vite] ${msg}`);
        customLogger.info = (msg) => logger.info(`[Vite] ${msg}`);
        return customLogger;
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
}
