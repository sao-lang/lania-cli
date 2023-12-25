import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import path from 'path';
import copy from 'rollup-plugin-copy';
import packageJsonContent from '../packages/templates/package.json' assert { type: 'json', integrity: 'sha384-ABC123' };
import { defineConfig } from 'rollup';
import { __dirname } from './utils.js';

const resolve = (p) => path.resolve(path.resolve(__dirname, '../packages/templates'), p);

const outputConfigs = {
    'esm-bundler': {
        file: resolve('dist/src/index.js'),
        format: 'es',
    },
    cjs: {
        file: resolve('dist/src/index.cjs'),
        format: 'cjs',
    },
};
const createConfig = (output) => {
    let external = [...Object.keys(packageJsonContent.dependencies || {}), 'path', 'fs'];
    return {
        input: resolve('src/index.ts'),
        output,
        external,
        plugins: [
            json(),
            ts({ tsconfig: path.resolve(__dirname, '../tsconfig.template.json') }),
            cjs(),
            nodeResolve({ preferBuiltins: true }),
            // output.format === 'js' &&
            //     copy({
            //         targets: [
            //             {
            //                 src: `../packages/templates/src/templates/*.ejs`,
            //                 dest: `../packages/${process.env.TARGET}/dist/src/templates`,
            //             },
            //         ],
            //     }),
        ].filter(Boolean),
    };
};
export default defineConfig(
    ['esm-bundler', 'cjs'].map((format) => createConfig(outputConfigs[format])),
);
