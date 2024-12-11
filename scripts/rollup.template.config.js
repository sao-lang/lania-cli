// rollup.template.config.js
import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import path, { resolve } from 'path';
import { readFileSync } from 'fs';
// import packageJsonContent from '../packages/templates/package.json' assert { type: 'json', integrity: 'sha384-ABC123' };
import { defineConfig } from 'rollup';
import { __dirname, resolvePath } from './utils.js';

const packageJsonContent = JSON.parse(
    readFileSync(resolve(__dirname, '../packages/cli/package.json'), 'utf-8'),
);
const resolveSubPath = (subPath) => {
    return resolvePath('templates', subPath);
};
const resolvePlugin = () => {
    return [
        json(),
        ts({ tsconfig: path.resolve(__dirname, '../tsconfig.template.json') }),
        cjs(),
        nodeResolve({ preferBuiltins: true }),
    ].filter(Boolean);
};

const createConfig = (type) => {
    const outputConfigs = {
        esm: {
            // file: resolveSubPath('dist/src/index.js'),
            dir: resolveSubPath('dist/src/esm'),
            format: 'es',
            // entryFileNames: 'index.js',
            entryFileNames: '[name].js', // 输出文件名格式
            preserveModules: true, // 保留模块路径结构
        },
        cjs: {
            // file: resolveSubPath('dist/src/index.cjs'),
            dir: resolveSubPath('dist/src/cjs'),
            format: 'cjs',
            entryFileNames: '[name].cjs',
            preserveModules: true, // 保留模块路径结构
        },
    };
    let external = [...Object.keys(packageJsonContent.dependencies || {}), 'path', 'fs'];
    return {
        input: resolveSubPath('src/index.ts'),
        output: outputConfigs[type],
        external,
        plugins: resolvePlugin(),
        onwarn(warning, warn) {
            if (warning.code === 'MIXED_EXPORTS') return;
            warn(warning);
        },
    };
};
export default defineConfig(['esm', 'cjs'].map((type) => createConfig(type)));
