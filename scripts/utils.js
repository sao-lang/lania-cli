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

export const BUILD_CONFIG_MAP = {
    common: {
        value: BUILD_CONFIG_MAP.common.value,
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
    commandAddTmps: {
        value: 'command-add-templates',
        label: 'Add命令模板文件',
    },
    templatesTmps: {
        value: 'templates-tmps',
        label: '模板库模板文件',
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
        return [
            json(),
            ts({
                tsconfig: path.resolve(__dirname, '../packages/templates/tsconfig.templates.json'),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === BUILD_CONFIG_MAP.commandAddTmps.value) {
        return [
            ts({
                tsconfig: path.resolve(
                    __dirname,
                    '../packages/command-add/tsconfig.command-add-tmps.json',
                ),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === BUILD_CONFIG_MAP.templatesTmps.value) {
        return [
            ts({
                tsconfig: path.resolve(__dirname, '../packages/templates/tsconfig.templates-tmps.json'),
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
    if (
        [
            BUILD_CONFIG_MAP.compilers.value,
            BUILD_CONFIG_MAP.linters.value,
            BUILD_CONFIG_MAP.commandSync.value,
            BUILD_CONFIG_MAP.commandAdd.value,
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
        ...resolveDependencies,
    ];
};
