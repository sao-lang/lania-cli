import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern } from './utils.js';

const resolveSubPath = (subPath) => resolvePath('common', subPath);

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
            external: resolveExtern('common'),
            plugins: resolvePlugins('common'),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};

export default defineConfig(createConfig);
