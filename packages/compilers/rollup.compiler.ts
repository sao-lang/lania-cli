import text from '@utils/text';
import { Compiler } from './compiler.base';
import to from '@utils/to';
import fs from 'fs';
import path from 'path';

import { type RollupOptions, rollup, OutputBundle } from 'rollup';
import logger from '@utils/logger';
import { mergeConfig } from 'vite';
import { logOnBuildRollupPlugin } from './compiler.plugin';
import { ConfigOption, LogOnBuildRollupPluginOptions } from '@lania-cli/types';

export class RollupCompiler extends Compiler<RollupOptions> {
    protected configOption: ConfigOption;
    protected server: null;
    constructor(configPath?: string) {
        super();
        this.configOption = { module: 'rollup', configPath };
    }
    public async build(config: RollupOptions = {}) {
        const prevDate = new Date().getTime();
        const logOnBuildOptions: LogOnBuildRollupPluginOptions = {
            onWriteBundleEnd: () => {
                if (!configuration.watch) {
                    const now = new Date().getTime();
                    logger.log(`built in ${(now - prevDate) / 1000}s`, {
                        color: '#21a579',
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
        const configuration = await this.mergeConfig(
            mergeConfig(config, { plugins: [logOnBuildRollupPlugin(logOnBuildOptions)] }),
        );
        const [buildErr] = await to(rollup(configuration));
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
    }
}
