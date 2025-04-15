import { defineConfig } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import { resolvePath, __dirname, getPackageJsonDependencies } from './utils.js';
import injectVarsPlugin from './inject-vars-plugin.js';
import path from 'path';

const resolveSubPath = (subPath) => resolvePath('types', subPath);

const resolvePlugins = () => [
    ts({ tsconfig: path.resolve(__dirname, '../tsconfig.types.json') }),
    cjs(),
    nodeResolve({ preferBuiltins: true }),
    injectVarsPlugin(),
];

const createConfig = () => {
    const input = resolveSubPath('index.ts');
    const dependencies = getPackageJsonDependencies('types');
    const external = [...dependencies];
    const map = {
        esm: {
            format: 'es',
            entryFileNames: '[name].js',
        }
    };
    return ['esm'].map((type) => ({
        input,
        output: {
            dir: resolveSubPath('dist'),
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
