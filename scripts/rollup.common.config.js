import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern, BUILD_CONFIG_MAP } from './utils.js';

const resolveSubPath = (subPath) => resolvePath(BUILD_CONFIG_MAP.common.value, subPath);

const createConfig = () => {
    const input = resolveSubPath('index.ts');
    return [
        {
            input,
            output: {
                dir: resolveSubPath('dist'),
                preserveModules: true,
                format: 'es',
                entryFileNames: '[name].js',
            },
            external: resolveExtern(BUILD_CONFIG_MAP.common.value),
            plugins: resolvePlugins(BUILD_CONFIG_MAP.common.value),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};

export default defineConfig(createConfig);
