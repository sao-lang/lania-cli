import { defineConfig } from 'rollup';
import { resolveSubPath, resolvePlugins, resolvedExterns, BUILD_CONFIG_MAP } from './utils.js';

const resolveTypesPath = (subPath) => resolveSubPath('packages', BUILD_CONFIG_MAP.types.value, subPath);
console.log({ resolveTypesPath: resolveTypesPath('index.ts') });
const createConfig = () => {
    return [
        {
            input: resolveTypesPath('index.ts'),
            output: {
                dir: resolveTypesPath('dist'),
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
