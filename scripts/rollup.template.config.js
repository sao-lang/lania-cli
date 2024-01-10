import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import path from 'path';
import packageJsonContent from '../packages/templates/package.json' assert { type: 'json', integrity: 'sha384-ABC123' };
import { defineConfig } from 'rollup';
import { __dirname, resolvePath } from './utils.js';

const resolveSubPath = (subPath) => {
    return resolvePath('templates', subPath);
};

const outputConfigs = {
    'esm-bundler': {
        file: resolveSubPath('dist/src/index.js'),
        format: 'es',
    },
    cjs: {
        file: resolveSubPath('dist/src/index.cjs'),
        format: 'cjs',
    },
};
const createConfig = (output) => {
    let external = [...Object.keys(packageJsonContent.dependencies || {}), 'path', 'fs'];
    return {
        input: resolveSubPath('src/index.ts'),
        output,
        external,
        plugins: [
            json(),
            ts({ tsconfig: path.resolve(__dirname, '../tsconfig.template.json') }),
            cjs(),
            nodeResolve({ preferBuiltins: true }),
        ].filter(Boolean),
    };
};
export default defineConfig(
    ['esm-bundler', 'cjs'].map((format) => createConfig(outputConfigs[format])),
);
