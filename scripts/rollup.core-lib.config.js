// rollup.config.js
import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern, BUILD_CONFIG_MAP } from './utils.js';
import * as glob from 'glob';
import path from 'path';

const packages = [
    BUILD_CONFIG_MAP.compilers.value,
    BUILD_CONFIG_MAP.linters.value,
    BUILD_CONFIG_MAP.commandSync.value,
    BUILD_CONFIG_MAP.commandAdd.value,
    BUILD_CONFIG_MAP.commandBuild.value,
    BUILD_CONFIG_MAP.commandLint.value,
    BUILD_CONFIG_MAP.commandDev.value,
    BUILD_CONFIG_MAP.commandRelease.value,
    BUILD_CONFIG_MAP.commandCreate.value,
];

const createPackageConfig = (pkg) => {
    const input = resolvePath(pkg, 'index.ts');

    return {
        input,
        output: {
            dir: resolvePath(pkg, 'dist'),
            format: 'es',
            preserveModules: true,
            entryFileNames: '[name].js',
        },
        external: resolveExtern(pkg),
        plugins: resolvePlugins(pkg),
        onwarn(warning, warn) {
            if (warning.code === 'MIXED_EXPORTS') return;
            warn(warning);
        },
    };
};

const createTemplateFileConfig = () => {
    const resolveSubPath = (subPath) => {
        return resolvePath(BUILD_CONFIG_MAP.commandAdd.value, subPath);
    };
    const templateDirs = glob.sync('templates/**/*.ts', {
        cwd: resolveSubPath(''),
        absolute: true,
    });
    return templateDirs.map((templateDir) => {
        const parentDirName = path.basename(path.dirname(templateDir));
        return {
            input: templateDir,
            output: [
                {
                    dir: resolveSubPath(`dist/${parentDirName}`),
                    format: 'esm',
                },
            ],
            external: resolveExtern(BUILD_CONFIG_MAP.commandAdd.value),
            plugins: resolvePlugins(BUILD_CONFIG_MAP.commandAddTmps.value),
        };
    });
};

export default defineConfig([...packages.map(createPackageConfig), ...createTemplateFileConfig()]);
