// rollup.core.config.js
import { defineConfig } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import { resolvePath, getPackageJsonDependencies } from './utils.js';
import injectVarsPlugin from './inject-vars-plugin.js';

const resolveSubPath = (subPath) => resolvePath('core', subPath);

const resolvePlugins = () => [
    json(),
    ts({ tsconfig: resolveSubPath('tsconfig.json') }),
    cjs(),
    nodeResolve({ preferBuiltins: true }),
    alias({
        entries: [
            { find: '@commands', replacement: '../core/commands' },
            { find: '@utils', replacement: '../core/utils' },
            { find: '@lib', replacement: '../core/lib' },
            { find: '@compilers', replacement: '../core/lib/compilers' },
            { find: '@runners', replacement: '../core/lib/runners' },
            { find: '@linters', replacement: '../core/lib/linters' },
            { find: '@constants', replacement: '../core/constants' },
            { find: '@package-managers', replacement: '../core/lib/package-managers' },
            { find: '@configuration', replacement: '../core/lib/configuration' },
            { find: '@engines', replacement: '../core/lib/engines' },
        ],
    }),
    injectVarsPlugin(),
];
const createConfig = () => {
    const input = resolveSubPath('commands/index.ts');
    const dependencies = getPackageJsonDependencies('core');
    const external = [...dependencies, 'path', 'fs', 'net'];
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
    return ['esm'].map((type) => ({
        input,
        output: {
            dir: resolveSubPath(`dist/src/${type}`),
            format: 'es',
            preserveModules: true, // 保留模块路径结构
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
