import { build, createServer, createLogger, mergeConfig } from 'vite';
import type { ViteDevServer, InlineConfig } from 'vite';
import { Compiler } from './compiler.base';
import path from 'path';
import fs from 'fs';
import { to, styleText, logger } from '@lania-cli/common';
import type { OutputBundle } from 'rollup';
import { logOnBuildRollupPlugin } from './compiler.plugin';
import { ConfigOption, LogOnBuildRollupPluginOptions } from '@lania-cli/types';

export class ViteCompiler extends Compiler<InlineConfig, ViteDevServer> {
    protected configOption: ConfigOption;
    protected server: ViteDevServer;
    constructor(configPath?: string) {
        super();
        this.configOption = { module: 'vite', configPath };
    }
    public async createServer(config?: InlineConfig) {
        await this.closeServer();
        const configuration = await this.mergeWithPluginOptions(config);
        const [createServerErr, server] = await to(createServer(configuration));
        if (createServerErr) {
            logger.error(`Create server failed: ${createServerErr.message}`);
            throw createServerErr;
        }
        this.server = server;
        const [listenErr] = await to(this.server.listen());
        if (listenErr) {
            logger.error(`Server listen failed: ${listenErr.message}`);
            throw listenErr;
        }
        this.server.printUrls();
    }
    public async closeServer() {
        if (this.server) {
            await this.server.close();
        }
    }
    public async build(config?: InlineConfig) {
        const configuration = await this.mergeWithPluginOptions(config, true);
        const [buildErr] = await to(build(configuration));
        if (buildErr) {
            logger.error(`Build failed: ${buildErr.message}`);
            throw buildErr;
        }
    }

    private async mergeWithPluginOptions(config: InlineConfig, isBuildMode = false) {
        const configHook = (currentConfig: InlineConfig) => {
            return mergeConfig(currentConfig, { customLogger: this.createViteLogger() });
        };
        const logOptions = this.getLogOptions(isBuildMode);
        const plugins = [logOnBuildRollupPlugin(logOptions), { config: configHook }];
        return await this.mergeConfig(mergeConfig({ logLevel: 'silent', plugins }, config));
    }

    private getLogOptions(isBuildMode = false): LogOnBuildRollupPluginOptions {
        if (isBuildMode) {
            return {
                onWriteBundleEnd: () => logger.success('Build completed.'),
                onWriteBundle: async ({ dir }, bundle) => {
                    await this.logViteBundle(dir, bundle);
                },
                onBuildStart: () => logger.info('Build started...'),
            };
        }
        return {
            onBuildStart: () => logger.info('Server is watching for file changes...'),
        };
    }

    private createViteLogger() {
        const customLogger = createLogger();
        customLogger.error = (msg) => logger.error(`[Vite] ${msg}`);
        customLogger.warn = (msg) => logger.warn(`[Vite] ${msg}`);
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
            const styledName = styleText(name, { color: '#6a7c80' }).render();
            const styledSize = styleText(size, {
                bold: true,
                color: '#7a7c80',
            }).render();
            logger.info(`${styledName} ${styledSize}`);
        });
        await Promise.all(bundleEntries);
    }
}
export default ViteCompiler;
