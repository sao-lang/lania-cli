// rollup.core.config.js
import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern } from './utils.js';

const resolveSubPath = (subPath) => resolvePath('core', subPath);

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
            external: resolveExtern('core'),
            plugins: resolvePlugins('core'),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};

export default defineConfig(createConfig);
