// rollup.core.config.js
import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern, BUILD_CONFIG_MAP } from './utils.js';

const resolveSubPath = (subPath) => resolvePath(BUILD_CONFIG_MAP.core.value, subPath);

const createConfig = () => {
    const input = resolveSubPath('commands/index.ts');
    return [
        {
            input,
            output: {
                dir: resolveSubPath('dist'),
                format: 'es',
                preserveModules: true, // 保留模块路径结构
                entryFileNames: '[name].js',
            },
            external: resolveExtern(BUILD_CONFIG_MAP.core.value),
            plugins: resolvePlugins(BUILD_CONFIG_MAP.core.value),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};

export default defineConfig(createConfig);
