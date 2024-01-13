import Compiler, { type BaseCompilerInterface } from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';

import { type RollupOptions, rollup } from 'rollup';

export default class RollupCompiler extends Compiler<RollupOptions> {
    constructor(
        configOption?: {
            module?: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
            configPath?: string;
        },
        config?: RollupOptions,
    ) {
        const baseCompiler: BaseCompilerInterface<RollupOptions> = {
            build: async (config: RollupOptions = {}) => {
                const output = await rollup({ ...config });
                return output;
            },
        };
        const { module, configPath } = configOption || {};
        super(
            baseCompiler,
            !module ? { module: 'rollup', configPath } : { module, configPath },
            config,
        );
    }
}
