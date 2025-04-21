// rollup.core.config.js
import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern } from './utils.js';

const resolveSubPath = (subPath) => resolvePath('compilers', subPath);

const createConfig = () => {
    const input = resolveSubPath('index.ts');
    return [
        {
            input,
            output: {
                dir: resolveSubPath('dist'),
                format: 'es',
                preserveModules: true, // 保留模块路径结构
                entryFileNames: '[name].js',
            },
            external: resolveExtern('compilers'),
            plugins: resolvePlugins('compilers'),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};

export default defineConfig(createConfig);
