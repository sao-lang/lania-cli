import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolvedExterns, BUILD_CONFIG_MAP } from './utils.js';

const resolveSubPath = (subPath) => {
    return resolvePath(BUILD_CONFIG_MAP.templates.value, subPath);
};

const createConfig = () => {
    return [
        {
            input: resolveSubPath('index.ts'),
            output: {
                dir: resolveSubPath('dist'),
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
