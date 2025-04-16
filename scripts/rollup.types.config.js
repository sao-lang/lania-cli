import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern } from './utils.js';

const resolveSubPath = (subPath) => resolvePath('types', subPath);

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
            external: resolveExtern('types'),
            plugins: resolvePlugins('types'),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
};

export default defineConfig(createConfig);
