// rollup.core.config.js
import { defineConfig } from 'rollup';
import { resolvePlugins, resolvedExterns, BUILD_CONFIG_MAP, resolveSubPath } from './utils.js';

const resolveCorePath = (subPath) =>
    resolveSubPath('packages', BUILD_CONFIG_MAP.core.value, subPath);

const createConfig = () => {
    const input = resolveCorePath('commands/index.ts');
    return [
        {
            input,
            output: {
                dir: resolveCorePath('dist'),
                format: 'es',
                preserveModules: true, // 保留模块路径结构
                entryFileNames: '[name].js',
            },
            external: resolvedExterns,
            plugins: resolvePlugins(BUILD_CONFIG_MAP.core.value),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};

export default defineConfig(createConfig);
