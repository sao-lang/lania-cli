// rollup.cli.config.js
import { defineConfig } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import { readFileSync } from 'fs';
import { resolvePath, __dirname } from './utils.js';
import { resolve } from 'path';

const resolveSubPath = (subPath) => resolvePath('cli', subPath);

const resolvePlugins = () => [
    json(),
    ts({ tsconfig: resolveSubPath('tsconfig.json') }),
    cjs(),
    nodeResolve({ preferBuiltins: true }),
    alias({
        entries: [
            { find: '@commands', replacement: '../cli/commands' },
            { find: '@utils', replacement: '../cli/utils' },
            { find: '@lib', replacement: '../cli/lib' },
            { find: '@compilers', replacement: '../cli/lib/compilers' },
            { find: '@runners', replacement: '../cli/lib/runners' },
            { find: '@linters', replacement: '../cli/lib/linters' },
            { find: '@constants', replacement: '../cli/constants' },
            { find: '@package-managers', replacement: '../cli/lib/package-managers' },
            { find: '@configuration', replacement: '../cli/lib/configuration' },
            { find: '@engines', replacement: '../cli/lib/engines' },
        ],
    }),
];

const packageJsonContent = JSON.parse(
    readFileSync(resolve(__dirname, '../packages/cli/package.json'), 'utf-8'),
);
const input = resolveSubPath('commands/index.ts');
const external = [...Object.keys(packageJsonContent.dependencies || {}), 'path', 'fs', 'net'];

const createConfig = () => {
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
