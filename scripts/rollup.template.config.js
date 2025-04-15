import cjs from '@rollup/plugin-commonjs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import path from 'path';
import { defineConfig } from 'rollup';
import { __dirname, resolvePath, getPackageJsonDependencies } from './utils.js';
import * as glob from 'glob';
// import injectVarsPlugin from './inject-vars-plugin.js';
import { globalReplacePlugin } from './inject-plugin.js';

const resolveSubPath = (subPath) => {
    return resolvePath('templates', subPath);
};

const resolvePlugin = () => {
    return [
        json(),
        ts({ tsconfig: path.resolve(__dirname, '../tsconfig.template.json') }),
        cjs(),
        globalReplacePlugin({
            __dirname: {
                raw: `(() => { 
    const path = new URL(import.meta.url).pathname;
    return path.substring(0, path.lastIndexOf('/'));
  })()`,
            },
        }),
        // injectVarsPlugin(),
    ].filter(Boolean);
};
const dependencies = getPackageJsonDependencies('templates');
const createConfig = () => {
    const outputConfigs = {
        esm: {
            dir: resolveSubPath('dist'),
            format: 'es',
            preserveModules: true, // 保留模块路径结构
        },
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
                    dir: resolveSubPath(`dist/${parentDirName}/${currentDirName}`),
                    format: 'esm',
                },
            ],
            external: ['path', 'fs', 'fs/promises', ...dependencies],
            plugins: [
                ts({
                    tsconfig: path.resolve(__dirname, '../tsconfig.templates.json'),
                }),
                // injectVarsPlugin(),
            ],
        };
    });
};
export default defineConfig([...createConfig(), ...createTemplateFileConfig()]);
