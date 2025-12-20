import { defineConfig } from 'rollup';
import { resolveSubPath, resolvePlugins, resolvedExterns, BUILD_CONFIG_MAP } from './utils.js';

const resolveCommonPath = (subPath) =>
    resolveSubPath('packages', BUILD_CONFIG_MAP.common.value, subPath);

const createConfig = () => {
    const input = resolveCommonPath('index.ts');
    return [
        {
            input,
            output: {
                dir: resolveCommonPath('dist'),
                preserveModules: true,
                format: 'es',
                entryFileNames: '[name].js',
            },
            external: resolvedExterns,
            plugins: resolvePlugins(BUILD_CONFIG_MAP.common.value),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};

export default defineConfig(createConfig);
