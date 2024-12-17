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
import * as glob from 'glob';

const resolveSubPath = (subPath) => {
    return resolvePath('templates', subPath);
};
const SRC_DIR = resolveSubPath('src');
const DIST_DIR = resolveSubPath('dist');

// 1. 匹配 `src/**/templates/**/*.ts` 文件
const TEMPLATE_FILES = glob.sync('**/templates/**/*.ts', { cwd: SRC_DIR });

const packageJsonContent = JSON.parse(
    readFileSync(resolve(__dirname, '../packages/cli/package.json'), 'utf-8'),
);
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
// console.log({
//     arr: TEMPLATE_FILES.map((inputPath) => {
//         const outputPath = path.join(
//             DIST_DIR,
//             path.relative(SRC_DIR, inputPath).replace(/\.ts$/, '.js'),
//         );

//         return {
//             input: resolveSubPath(`src/templates/src/${inputPath}`), // 输入文件
//             output: {
//                 file: resolveSubPath(`dist/src/esm/src/${inputPath.replace(/\.ts$/, '.js')}`), // 输出文件路径
//                 format: 'esm', // 输出为 ES 模块
//             },
//             plugins: [
//                 ts({
//                     tsconfig: path.resolve(__dirname, '../tsconfig.json'),
//                     useTsconfigDeclarationDir: true,
//                 }),
//             ],
//             outputPath
//         };
//     }).map(item => ({file: item.output.file, output: item.outputPath}))
// });
export default defineConfig([
    ...['esm', 'cjs'].map((type) => createConfig(type)),
    ...TEMPLATE_FILES.map((inputPath) => {

        return {
            input: resolveSubPath(`src/${inputPath}`), // 输入文件
            output: {
                file: resolveSubPath(`dist/src/esm/${inputPath.replace(/\.ts$/, '.js')}`), // 输出文件路径
                format: 'esm', // 输出为 ES 模块
            },
            plugins: [
                ts({
                    tsconfig: path.resolve(__dirname, '../tsconfig.templates.json'),
                    useTsconfigDeclarationDir: true,
                }),
            ],
        };
    }),
]);
