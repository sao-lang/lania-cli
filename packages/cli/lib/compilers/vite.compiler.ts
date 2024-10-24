import {
    type InlineConfig,
    build,
    createServer,
    type ViteDevServer,
    createLogger,
    mergeConfig,
} from 'vite';
import Compiler from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';
import logger from '@utils/logger';
import path from 'path';
import fs from 'fs';
import to from '@utils/to';
import text from '@utils/text';
import { type OutputBundle } from 'rollup';
import { LogOnBuildRollupPluginOptions, logOnBuildRollupPlugin } from './compiler.plugin';

const createViteLogger = () => {
    const customLogger = createLogger();
    customLogger.error = (msg) => logger.error(`[Vite] ${msg}`);
    customLogger.warn = (msg) => logger.warning(`[Vite] ${msg}`);
    customLogger.info = (msg) => logger.log(`[Vite] ${msg}`);
    return customLogger;
};

// 优化后的 logViteBundle
const logViteBundle = async (dir: string, bundle: OutputBundle) => {
    const bundleEntries = Object.keys(bundle).map(async (key) => {
        const { fileName } = bundle[key];
        const [error, stats] = await to(fs.promises.stat(`${dir}/${fileName}`));
        if (!error) {
            const name = `${path.basename(dir)}/${fileName}`;
            const size = (stats.size / 1024).toFixed(2) + 'K';
            logger.log(
                `${text(name, { color: '#6a7c80' })} ${text(size, { bold: true, color: '#7a7c80' })}`
            );
        } else {
            logger.error(`Failed to log bundle: ${error.message}`);
        }
    });

    await Promise.all(bundleEntries);
};

// 提取重复的配置合并逻辑
const mergeWithPluginOptions = (
    config: InlineConfig,
    logOnBuildOptions: LogOnBuildRollupPluginOptions
): InlineConfig => {
    return mergeConfig(
        {
            logLevel: 'silent',
            plugins: [
                logOnBuildRollupPlugin(logOnBuildOptions),
                {
                    config: (currentConfig) => mergeConfig(currentConfig, { customLogger: createViteLogger() }),
                },
            ],
        },
        config
    );
};

export default class ViteCompiler extends Compiler<InlineConfig> {
    private server: ViteDevServer | null = null;

    constructor(
        configOption?: {
            module?: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
            configPath?: string;
        },
        config?: InlineConfig
    ) {
        // 先调用 super
        const { module, configPath } = configOption || {};
        super(
            {
                build: async (config: InlineConfig = {}) => this.buildHandler(config),
                createServer: async (config: InlineConfig = {}) => this.createServerHandler(config),
                closeServer: async () => this.closeServerHandler(),
            },
            { module: module || 'vite', configPath },
            config
        );
    }

    private async buildHandler(config: InlineConfig = {}) {
        const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
            onWriteBundleEnd: () => logger.log('Build completed.'),
            onWriteBundle: async ({ dir }, bundle) => {
                await logViteBundle(dir, bundle);
            },
            onBuildStart: () => logger.log('Build started...'),
        };

        const configuration = mergeWithPluginOptions(config, logOnBuildOptions);
        try {
            return await build(configuration);
        } catch (err) {
            logger.error(`Build failed: ${(err as Error).message}`);
            throw err;
        }
    }

    private async createServerHandler(config: InlineConfig = {}) {
        await this.closeServer();

        const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
            onBuildStart: () => logger.log('Server is watching for file changes...'),
        };

        const configuration = mergeWithPluginOptions(config, logOnBuildOptions);
        this.server = await createServer(configuration);
        await this.server.listen();
        this.server.printUrls();
    }

    private async closeServerHandler() {
        if (this.server) {
            await this.server.close();
            this.server = null;
            logger.log('Vite server closed.');
        }
    }
}
