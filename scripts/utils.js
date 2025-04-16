import { fileURLToPath } from 'url';
import path, { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import { globalReplacePlugin } from './inject-vars-plugin.js';
// 获取当前模块的文件路径
export const __filename = fileURLToPath(import.meta.url);

// 获取当前模块的目录路径
export const __dirname = dirname(__filename);

export const resolvePath = (dir, subPath) => {
    return resolve(resolve(__dirname, `../packages/${dir}`), subPath);
};

export const getPackageJson = (packageName = 'core') => {
    const json = JSON.parse(
        readFileSync(resolve(__dirname, `../packages/${packageName}/package.json`), 'utf-8'),
    );
    return json;
};

const { version } = getPackageJson();

export const createCommonInjectVars = () => {
    return {
        __dirname: {
            raw: '(() => { const path = new URL(import.meta.url).pathname;return path.substring(0, path.lastIndexOf(\'/\')); })()\n',
        },
        __filename: {
            raw: '(() => new URL(import.meta.url).pathname)();',
        },
        __version: JSON.stringify(version),
        __cwd: {
            raw: 'process.cwd()',
        },
    };
};

export const resolvePlugins = (packageName = 'core') => {
    if (packageName === 'common') {
        return [
            ts({ tsconfig: path.resolve(__dirname, '../tsconfig.common.json') }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === 'core') {
        return [
            json(),
            ts({ tsconfig: resolvePath('core', 'tsconfig.json') }),
            alias({
                entries: [
                    { find: '@commands', replacement: '../core/commands' },
                    { find: '@utils', replacement: '../core/utils' },
                    { find: '@lib', replacement: '../core/lib' },
                    { find: '@compilers', replacement: '../core/lib/compilers' },
                    { find: '@runners', replacement: '../core/lib/runners' },
                    { find: '@linters', replacement: '../core/lib/linters' },
                    { find: '@constants', replacement: '../core/constants' },
                    { find: '@package-managers', replacement: '../core/lib/package-managers' },
                    { find: '@configuration', replacement: '../core/lib/configuration' },
                    { find: '@engines', replacement: '../core/lib/engines' },
                ],
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === 'template') {
        return [
            json(),
            ts({ tsconfig: path.resolve(__dirname, '../tsconfig.template.json') }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === 'templates') {
        return [
            ts({
                tsconfig: path.resolve(__dirname, '../tsconfig.templates.json'),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === 'types') {
        return [
            ts({ tsconfig: path.resolve(__dirname, '../tsconfig.types.json') }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    return [];
};

export const resolveExtern = (packageName = 'core') => {
    const { dependencies, devDependencies } = getPackageJson(packageName);
    const resolveDependencies = [
        ...Object.keys(dependencies || {}),
        ...Object.keys(devDependencies || {}),
    ];
    return ['path', 'fs', 'net', 'fs/promises', ...resolveDependencies];
};
