import { defineConfig } from 'rollup';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import { resolvePath, __dirname, getPackageJsonDependencies } from './utils.js';
import injectVarsPlugin from './inject-vars-plugin.js';
import path from 'path';

const resolveSubPath = (subPath) => resolvePath('common', subPath);

const resolvePlugins = () => [
    ts({ tsconfig: path.resolve(__dirname, '../tsconfig.common.json') }),
    cjs(),
    injectVarsPlugin(),
];

const createConfig = () => {
    const input = resolveSubPath('index.ts');
    const dependencies = getPackageJsonDependencies('common');
    const external = ['path', 'fs', ...dependencies];
    const map = {
        esm: {
            format: 'es',
            entryFileNames: '[name].js',
        },
        // cjs: {
        //     format: 'cjs',
        //     entryFileNames: '[name].cjs',
        // },
    };
    return ['esm'].map((type) => ({
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
