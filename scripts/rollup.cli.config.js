import { defineConfig } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import path from 'path';
import packageJsonContent from '../packages/cli/package.json' assert { type: 'json', integrity: 'sha384-ABC123' };
import alias from '@rollup/plugin-alias';
import { __dirname } from './utils.js';

const resolvePath = (subPath) => {
    return path.resolve(path.resolve(__dirname, '../packages/cli'), subPath);
};

const resolvePlugins = () => {
    return [
        json(),
        ts({ tsconfig: resolvePath('tsconfig.json') }),
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
            ],
        }),
    ];
};
const input = resolvePath('commands/index.ts');
const external = [...Object.keys(packageJsonContent.dependencies || {}), 'path', 'fs', 'net'];

export default defineConfig([
    {
        input,
        output: {
            file: resolvePath('dist/src/index.js'),
            format: 'es',
        },
        external,
        plugins: resolvePlugins(),
    },
    {
        input,
        output: {
            file: resolvePath('dist/src/index.cjs'),
            format: 'cjs',
        },
        external,
        plugins: resolvePlugins(),
    },
]);
