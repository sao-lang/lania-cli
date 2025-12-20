import { defineConfig } from 'rollup';
import { resolveSubPath, resolvePlugins, resolvedExterns, BUILD_CONFIG_MAP } from './utils.js';

const resolveTmpsPath = (subPath) => {
    return resolveSubPath('packages', BUILD_CONFIG_MAP.templates.value, subPath);
};

const createConfig = () => {
    return [
        {
            input: resolveTmpsPath('index.ts'),
            output: {
                dir: resolveTmpsPath('dist'),
                format: 'es',
                preserveModules: true,
            },
            external: resolvedExterns,
            plugins: resolvePlugins(BUILD_CONFIG_MAP.templates.value),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};
export default defineConfig(createConfig());
