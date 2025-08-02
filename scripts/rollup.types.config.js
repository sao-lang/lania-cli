import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolvedExterns, BUILD_CONFIG_MAP } from './utils.js';

const resolveSubPath = (subPath) => resolvePath(BUILD_CONFIG_MAP.types.value, subPath);

const createConfig = () => {
    return [
        {
            input: resolveSubPath('index.ts'),
            output: {
                dir: resolveSubPath('dist'),
                format: 'es',
                preserveModules: true,
                entryFileNames: '[name].js',
            },
            external: resolvedExterns,
            plugins: resolvePlugins(BUILD_CONFIG_MAP.types.value),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};

export default defineConfig(createConfig);
