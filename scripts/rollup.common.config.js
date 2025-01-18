import { defineConfig } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import { resolvePath, __dirname } from './utils.js';
import injectVarsPlugin from './inject-vars-plugin.js';
import path from 'path';

const resolveSubPath = (subPath) => resolvePath('common', subPath);

const resolvePlugins = () => [
    ts({ tsconfig: path.resolve(__dirname, '../tsconfig.common.json') }),
    cjs(),
    nodeResolve({ preferBuiltins: true }),
    injectVarsPlugin(),
];

const createConfig = () => {
    const input = resolveSubPath('index.ts');
    console.log({ input });
    const external = ['path', 'fs', 'net'];
    const map = {
        esm: {
            format: 'es',
            entryFileNames: '[name].js',
        },
        cjs: {
            format: 'cjs',
            entryFileNames: '[name].cjs',
        },
    };
    return ['esm', 'cjs'].map((type) => ({
        input,
        output: {
            dir: resolveSubPath(`dist/src/${type}`),
            format: 'es',
            preserveModules: true,
            ...map[type],
        },
        external,
        plugins: resolvePlugins(),
        onwarn(warning, warn) {
            if (warning.code === 'MIXED_EXPORTS') return;
            warn(warning);
        },
    }));
};

export default defineConfig(createConfig);
