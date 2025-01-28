import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import path from 'path';
import { defineConfig } from 'rollup';
import { __dirname, resolvePath, getPackageJsonDependencies } from './utils.js';
import * as glob from 'glob';
import injectVarsPlugin from './inject-vars-plugin.js';
import dts from 'rollup-plugin-dts';

const resolveSubPath = (subPath) => {
    return resolvePath('templates', subPath);
};

const resolvePlugin = () => {
    return [
        json(),
        ts({ tsconfig: path.resolve(__dirname, '../tsconfig.template.json') }),
        cjs(),
        injectVarsPlugin(),
    ].filter(Boolean);
};
const dependencies = getPackageJsonDependencies('templates');
const createConfig = () => {
    const outputConfigs = {
        esm: {
            dir: resolveSubPath('dist/src/esm'),
            format: 'es',
            // entryFileNames: '[name].js', // 输出文件名格式
            preserveModules: true, // 保留模块路径结构
        },
        // cjs: {
        //     dir: resolveSubPath('dist/src/cjs'),
        //     format: 'cjs',
        //     entryFileNames: '[name].cjs',
        //     preserveModules: true, // 保留模块路径结构
        // },
    };
    return ['esm'].map((type) => ({
        input: resolveSubPath('src/index.ts'),
        output: outputConfigs[type],
        external: ['path', 'fs', 'fs/promises', ...dependencies],
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
            input: tsFiles,
            output: [
                {
                    dir: resolveSubPath(`dist/src/esm/${parentDirName}/${currentDirName}`),
                    format: 'esm',
                },
                // {
                //     dir: resolveSubPath(`dist/src/cjs/${parentDirName}/${currentDirName}`),
                //     format: 'cjs',
                // },
            ],
            external: ['path', 'fs', 'fs/promises', ...dependencies],
            plugins: [
                ts({
                    tsconfig: path.resolve(__dirname, '../tsconfig.templates.json'),
                    // useTsconfigDeclarationDir: true,
                }),
                injectVarsPlugin(),
            ],
        };
    });
};
export default defineConfig([
    ...createConfig(),
    ...createTemplateFileConfig(),
    {
        input: resolveSubPath('dist/src/esm/templates/src/index.d.ts'),
        output: {
            file: resolveSubPath('dist/src/esm/index.d.ts'),
            format: 'esm',
        },
        plugins: [dts()],
    },
]);
