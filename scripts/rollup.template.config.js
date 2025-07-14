import path from 'path';
import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern, BUILD_CONFIG_MAP } from './utils.js';
import * as glob from 'glob';

const resolveSubPath = (subPath) => {
    return resolvePath(BUILD_CONFIG_MAP.templates.value, subPath);
};

const createConfig = () => {
    return [
        {
            input: resolveSubPath('src/index.ts'),
            output: {
                dir: resolveSubPath('dist'),
                format: 'es',
                preserveModules: true,
            },
            external: resolveExtern(BUILD_CONFIG_MAP.templates.value),
            plugins: resolvePlugins(BUILD_CONFIG_MAP.templates.value),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};
export default defineConfig(createConfig());
