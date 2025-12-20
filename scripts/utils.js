import { fileURLToPath } from 'url';
import path, { dirname, resolve } from 'path';
import * as glob from 'glob';
import { readFileSync } from 'fs';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import ts from 'rollup-plugin-typescript2';
import { globalReplacePlugin } from './inject-vars-plugin.js';
import copy from 'rollup-plugin-copy';
import fs from 'fs';
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

// export const resolveSubPath = (dir, subPath) => {
//     return resolve(resolve(__dirname, `../packages/${dir}`), subPath);
// };

export function getFiles(dirPath, options = {}) {
    const { ext, maxDepth = Infinity, targetLevel, filterDir } = options;
    const results = [];
    const extArr = ext ? (Array.isArray(ext) ? ext : [ext]) : null;

    function walk(currentPath, depth, insideFilteredDir) {
        const list = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const item of list) {
            const fullPath = path.join(currentPath, item.name);

            if (item.isDirectory()) {
                let enterDir = false;

                if (!filterDir) {
                    // 未设置 filterDir → 遍历所有目录
                    enterDir = true;
                } else if (typeof filterDir === 'string') {
                    enterDir = item.name === filterDir;
                } else if (typeof filterDir === 'function') {
                    enterDir = filterDir(fullPath);
                }

                // 如果目录满足条件且未超过 maxDepth，则递归
                if (enterDir && depth < maxDepth) {
                    // 如果设置了 filterDir 且当前目录匹配，则 insideFilteredDir 设置为 true
                    const newInsideFilteredDir = filterDir ? true : insideFilteredDir;
                    walk(fullPath, depth + 1, newInsideFilteredDir);
                }
            } else if (item.isFile()) {
                const matchExt = !extArr || extArr.some((suffix) => item.name.endsWith(suffix));
                const matchLevel = targetLevel === undefined || targetLevel === depth;

                // 文件是否收集：
                // 1. 未设置 filterDir → 收集所有匹配文件
                // 2. 设置了 filterDir → 只收集在匹配目录及其子目录下的文件
                const collectFile = !filterDir || insideFilteredDir;

                if (matchExt && matchLevel && collectFile) {
                    results.push(fullPath);
                }
            }
        }
    }

    walk(dirPath, 0, false);
    return results;
}

export const resolveSubPath = (...subPaths) => {
    const [firstSubPaths] = subPaths;
    if (Array.isArray(firstSubPaths)) {
        return firstSubPaths.reduce(
            (acc, cur) => (cur && typeof cur === 'string' ? `${acc}/${cur}` : acc),
            resolve(__dirname, '../'),
        );
    }
    if (subPaths.length > 0) {
        return subPaths.reduce(
            (acc, cur) => (cur && typeof cur === 'string' ? `${acc}/${cur}` : acc),
            resolve(__dirname, '../'),
        );
    }
    return resolve(__dirname, `../${firstSubPaths}`);
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
                tsconfig: path.resolve(__dirname, `../packages/${packageName}/tsconfig.json`),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === BUILD_CONFIG_MAP.core.value) {
        return [
            json(),
            ts({ tsconfig: resolveSubPath('packages', BUILD_CONFIG_MAP.core.value, 'tsconfig.json') }),
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
        const srcDirs = glob.sync('**/ejs', {
            cwd: templatesBase,
            absolute: true,
        });
        return [
            copy({
                targets: srcDirs.map((srcTemplateDir) => {
                    const relative = path.relative(templatesBase, srcTemplateDir);
                    const [pkgName] = relative.split(path.sep);
                    return {
                        src: [
                            `../packages/templates/${pkgName}/ejs/*.ejs`,
                            `../packages/templates/${pkgName}/ejs/.*.ejs`,
                            `../packages/templates/${pkgName}/name.json`,
                        ],
                        dest: `../packages/templates/dist/__lania-${pkgName}`,
                    };
                }),
            }),
            json(),
            ts({
                tsconfig: path.resolve(__dirname, '../packages/templates/tsconfig.json'),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    if (packageName === BUILD_CONFIG_MAP.types.value) {
        return [
            ts({
                tsconfig: path.resolve(__dirname, `../packages/${packageName}/tsconfig.json`),
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
                tsconfig: path.resolve(__dirname, `../packages/${packageName}/tsconfig.json`),
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
                tsconfig: path.resolve(__dirname, `../packages/${packageName}/tsconfig.json`),
            }),
            globalReplacePlugin(createCommonInjectVars()),
        ];
    }
    return [];
};

export const resolvedExterns = (() => {
    return [
        ...new Set([
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
            '@lania-cli/types',
            'yargs/helpers',
            'url',
            'os',
            'module',
            ...Object.values(BUILD_CONFIG_MAP)
                .map((item) => {
                    const { dependencies, devDependencies } = getPackageJson(item.value);
                    const resolveDependencies = [
                        ...Object.keys(dependencies || {}),
                        ...Object.keys(devDependencies || {}),
                    ];
                    return resolveDependencies;
                })
                .flat(),
        ]),
    ];
})();
