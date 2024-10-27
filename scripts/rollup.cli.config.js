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

const packageJsonContent = JSON.parse(readFileSync(resolve(__dirname, '../packages/cli/package.json'), 'utf-8'));
const input = resolveSubPath('commands/index.ts');
const external = [...Object.keys(packageJsonContent.dependencies || {}), 'path', 'fs', 'net'];

export default defineConfig([
    {
        input,
        output: {
            file: resolveSubPath('dist/src/index.js'),
            format: 'es',
        },
        external,
        plugins: resolvePlugins(),
    },
    {
        input,
        output: {
            file: resolveSubPath('dist/src/index.cjs'),
            format: 'cjs',
        },
        external,
        plugins: resolvePlugins(),
    },
]);
