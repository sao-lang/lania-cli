import { styleText, logger, mergeConfig } from '@lania-cli/common';
import { Compiler } from './compiler.base';
import { to } from '@lania-cli/common';
import fs from 'fs';
import path from 'path';

import { type RollupOptions, rollup, OutputBundle } from 'rollup';
// import { mergeConfig } from 'vite';
import { logOnBuildRollupPlugin } from './compiler.plugin';
import { CompilerHandleOptions, ConfigOption, LogOnBuildRollupPluginOptions } from '@lania-cli/types';

export class RollupCompiler extends Compiler<RollupOptions, null, typeof rollup> {
    protected configOption: ConfigOption;
    protected server: null;
    protected base: typeof rollup;
    constructor(configPath?: string, options?: CompilerHandleOptions) {
        super();
        this.configOption = { module: 'rollup', configPath };
        this.base = options?.outerCompiler ?? rollup;
    }
    public async build(config: RollupOptions = {}) {
        const prevDate = new Date().getTime();
        const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
            onWriteBundleEnd: () => {
                if (!configuration.watch) {
                    const now = new Date().getTime();
                    logger.log(`built in ${(now - prevDate) / 1000}s`, {
                        style: { color: '#21a579' },
                    });
                }
            },
            onWriteBundle: async ({ dir }, bundle) => {
                if (!configuration.watch) {
                    await this.logBundle(dir, bundle);
                }
            },
            onBuildStart: () => {
                if (configuration.watch) {
                    logger.log('Watching for file changing!');
                }
            },
        };
        const configuration = await this.mergeBaseConfig(
            mergeConfig(config, { plugins: [logOnBuildRollupPlugin(logOnBuildOptions)] }, 'rollup'),
        );
        const [buildErr] = await to(this.base(configuration));
        if (buildErr) {
            logger.error(`Build failed: ${buildErr.message}`);
            throw buildErr;
        }
    }
    private async logBundle(dir: string, bundle: OutputBundle) {
        for (const key of Object.keys(bundle)) {
            const { fileName } = bundle[key];
            const [error, stats] = await to(fs.promises.stat(`${dir}/${fileName}`));
            if (!error) {
                const name = `${path.basename(dir)}/${fileName}`;
                const size = (stats.size / 1024).toFixed(2) + 'K';
                const nameModifiedText = styleText(name, {
                    color: '#6a7c80',
                }).render();
                const sizeModifiedText = styleText(size, {
                    bold: true,
                    color: '#7a7c80',
                }).render();
                logger.log(`${nameModifiedText} ${sizeModifiedText}`);
            } else {
                logger.error(error.message);
            }
        }
    }
}

export default RollupCompiler;
