import { fileURLToPath } from 'url';
import path, { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import ts from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import { globalReplacePlugin } from './inject-vars-plugin.js';
import copy from 'rollup-plugin-copy';
import * as glob from 'glob';
// 获取当前模块的文件路径
export const __filename = fileURLToPath(import.meta.url);

// 获取当前模块的目录路径
export const __dirname = dirname(__filename);

export const BUILD_CONFIG_MAP = {
    common: {
        value: 'common',
        label: '公共包',
    },
    core: {
        value: 'core',
        label: '核心包',
    },
    templates: {
        value: 'templates',
        label: '模板库',
    },
    compilers: {
        value: 'compilers',
        label: '编译器',
    },
    linters: {
        value: 'linters',
        label: 'linters',
    },
    commandSync: {
        value: 'command-sync',
        label: 'Sync命令',
    },
    commandCreate: {
        value: 'command-create',
        label: 'Create命令',
    },
    commandBuild: {
        value: 'command-build',
        label: 'Build命令',
    },
    commandDev: {
        value: 'command-dev',
        label: 'Dev命令',
    },
    commandAdd: {
        value: 'command-add',
        label: 'Add命令',
    },
    commandRelease: {
        value: 'command-release',
        label: 'Release命令',
    },
    commandLint: {
        value: 'command-lint',
        label: 'Lint命令',
    },
    types: {
        value: 'types',
        label: '类型定义',
    },
};

export const resolvePath = (dir, subPath) => {
    return resolve(resolve(__dirname, `../packages/${dir}`), subPath);
};

export const getPackageJson = (packageName = BUILD_CONFIG_MAP.core.value) => {
    const json = JSON.parse(
        readFileSync(resolve(__dirname, `../packages/${packageName}/package.json`), 'utf-8'),
    );
    return json;
};

const { version } = getPackageJson();

export const createCommonInjectVars = () => {
    return {
        __dirname: {
            raw: '(() => { const { pathname } = new URL(import.meta.url);const isWin = process.platform === \'win32\';const filePath = isWin && pathname.startsWith(\'/\') ? pathname.slice(1) : pathname;return filePath.slice(0, filePath.lastIndexOf(\'/\'));})()\n',
        },
        __filename: {
            raw: '(() => {const { pathname } = new URL(import.meta.url);return process.platform === \'win32\' && pathname.startsWith(\'/\') ? pathname.slice(1) : pathname; })()\n',
        },
        __version: JSON.stringify(version),
        __cwd: {
            raw: 'process.cwd()',
        },
    };
};

export const resolvePlugins = (packageName = BUILD_CONFIG_MAP.core.value) => {
    if (packageName === BUILD_CONFIG_MAP.common.value) {
        return [
            ts({
                tsconfig: path.resolve(
                    __dirname,
                    `../packages/${packageName}/tsconfig.${packageName}.json`,
                ),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === BUILD_CONFIG_MAP.core.value) {
        return [
            json(),
            ts({ tsconfig: resolvePath(BUILD_CONFIG_MAP.core.value, 'tsconfig.json') }),
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
    if (packageName === BUILD_CONFIG_MAP.templates.value) {
        const templatesBase = path.resolve(__dirname, '../packages/templates');
        const srcDirs = glob.sync('**/templates', {
            cwd: templatesBase,
            absolute: true,
        });
        return [
            copy({
                targets: srcDirs.map((srcTemplateDir) => {
                    const relative = path.relative(templatesBase, srcTemplateDir);
                    const [pkgName] = relative.split(path.sep);
                    return {
                        src: `../packages/templates/${pkgName}/templates/*.ejs`,
                        dest: `../packages/templates/dist/${pkgName}/templates`,
                    };
                }),
            }),
            json(),
            ts({
                tsconfig: path.resolve(__dirname, '../packages/templates/tsconfig.templates.json'),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === BUILD_CONFIG_MAP.types.value) {
        return [
            ts({
                tsconfig: path.resolve(
                    __dirname,
                    `../packages/${packageName}/tsconfig.${packageName}.json`,
                ),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === BUILD_CONFIG_MAP.commandAdd.value) {
        return [
            copy({
                targets: [
                    {
                        src: `../packages/${packageName}/templates/*.ejs`,
                        dest: `../packages/${packageName}/dist/templates`,
                    },
                ],
            }),
            json(),
            ts({
                tsconfig: path.resolve(
                    __dirname,
                    `../packages/${packageName}/tsconfig.${packageName}.json`,
                ),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (
        [
            BUILD_CONFIG_MAP.compilers.value,
            BUILD_CONFIG_MAP.linters.value,
            BUILD_CONFIG_MAP.commandSync.value,
            BUILD_CONFIG_MAP.commandBuild.value,
            BUILD_CONFIG_MAP.commandLint.value,
            BUILD_CONFIG_MAP.commandDev.value,
            BUILD_CONFIG_MAP.commandRelease.value,
            BUILD_CONFIG_MAP.commandCreate.value,
        ].includes(packageName)
    ) {
        return [
            json(),
            ts({
                tsconfig: path.resolve(
                    __dirname,
                    `../packages/${packageName}/tsconfig.${packageName}.json`,
                ),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    return [];
};

export const resolveExtern = (packageName = BUILD_CONFIG_MAP.core.value) => {
    const { dependencies, devDependencies } = getPackageJson(packageName);
    const resolveDependencies = [
        ...Object.keys(dependencies || {}),
        ...Object.keys(devDependencies || {}),
    ];
    return [
        'path',
        'fs',
        'net',
        'fs/promises',
        'eslint',
        'prettier',
        'prettier-plugin-stylus',
        'prettier-plugin-ejs',
        'prettier-plugin-svelte',
        'stylelint',
        'textlint',
        'inquirer',
        '@lania-cli/linters',
        'yargs/helpers',
        'url',
        ...resolveDependencies,
    ];
};
