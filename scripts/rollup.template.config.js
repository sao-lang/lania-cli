import nodeResolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import path, { resolve } from 'path';
import { readFileSync } from 'fs';
import { defineConfig } from 'rollup';
import { __dirname, resolvePath } from './utils.js';
import * as glob from 'glob';
import injectVarsPlugin from './inject-vars-plugin.js';

const resolveSubPath = (subPath) => {
    return resolvePath('templates', subPath);
};

const resolvePlugin = () => {
    return [
        json(),
        ts({ tsconfig: path.resolve(__dirname, '../tsconfig.template.json') }),
        cjs(),
        nodeResolve({ preferBuiltins: true }),
        injectVarsPlugin(),
    ].filter(Boolean);
};

const getPackageJsonContent = () => JSON.parse(
    readFileSync(resolve(__dirname, '../packages/core/package.json'), 'utf-8'),
);
const createConfig = () => {
    const outputConfigs = {
        esm: {
            dir: resolveSubPath('dist/src/esm'),
            format: 'es',
            entryFileNames: '[name].js', // 输出文件名格式
            preserveModules: true, // 保留模块路径结构
        },
        cjs: {
            dir: resolveSubPath('dist/src/cjs'),
            format: 'cjs',
            entryFileNames: '[name].cjs',
            preserveModules: true, // 保留模块路径结构
        },
    };
    const packageJsonContent = getPackageJsonContent();
    let external = [...Object.keys(packageJsonContent.dependencies || {}), 'path', 'fs'];
    return ['esm', 'cjs'].map((type) => ({
        input: resolveSubPath('src/index.ts'),
        output: outputConfigs[type],
        external,
        plugins: resolvePlugin(),
        onwarn(warning, warn) {
            if (warning.code === 'MIXED_EXPORTS') return;
            warn(warning);
        },
    }));
};
const createTemplateFileConfig = () => {
    const templateDirs = glob.sync('**/templates', {
        cwd: resolveSubPath('src'),
        absolute: true,
    });
    return templateDirs.map((templateDir) => {
        const tsFiles = glob.sync('**/*.ts', {
            cwd: templateDir,
            absolute: true,
        });
        const currentDirName = path.basename(templateDir);
        const parentDirName = path.basename(path.dirname(templateDir));
        return {
            input: tsFiles, // 输入文件
            output: [
                {
                    dir: resolveSubPath(`dist/src/esm/${parentDirName}/${currentDirName}`),
                    format: 'esm', // 输出为 ES 模块
                },
                {
                    dir: resolveSubPath(`dist/src/cjs/${parentDirName}/${currentDirName}`),
                    format: 'cjs', // 输出为 ES 模块
                },
            ],
            plugins: [
                ts({
                    tsconfig: path.resolve(__dirname, '../tsconfig.templates.json'),
                    useTsconfigDeclarationDir: true,
                }),
                injectVarsPlugin()
            ],
        };
    });
};
export default defineConfig([...createConfig(), ...createTemplateFileConfig()]);
