// rollup.config.js
import { defineConfig } from 'rollup';
import {
    resolveSubPath,
    resolvePlugins,
    resolvedExterns,
    BUILD_CONFIG_MAP,
    createCommonInjectVars,
    __dirname,
} from './utils.js';
import path from 'path';
import * as glob from 'glob';
import ts from 'rollup-plugin-typescript2';
import { globalReplacePlugin } from './inject-vars-plugin.js';

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

const createTmpListConfig = () => {
    const templatesBase = resolveSubPath('packages/templates');
    const srcDirs = glob.sync('**/name.json', {
        cwd: templatesBase,
        absolute: true,
        ignore: ['dist/**'],
    });
    return srcDirs.map((dir) => {
        const relative = path.relative(templatesBase, dir);
        const [pkgName] = relative.split(path.sep);
        const outputDir = resolveSubPath('packages', 'templates', 'dist', pkgName);
        return {
            input: dir.replace('name.json', 'index.ts'),
            output: {
                dir: outputDir,
                format: 'esm', // 保持 ESM 格式
                entryFileNames: '[name].js',
            },
            plugins: [
                ts({
                    tsconfig: path.resolve(__dirname, '../packages/templates/tsconfig.json'),
                }),
                globalReplacePlugin(createCommonInjectVars()),
            ],
            external: resolvedExterns,
        };
    });
};
const createPackageConfig = (pkgs) =>
    pkgs.map((pkg) => {
        const input = resolveSubPath('packages', pkg, 'index.ts');
        return {
            input,
            output: {
                dir: resolveSubPath('packages', pkg, 'dist'),
                format: 'es',
                preserveModules: true,
                entryFileNames: '[name].js',
            },
            external: resolvedExterns,
            plugins: resolvePlugins(pkg),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        };
    });

export default defineConfig([...createPackageConfig(packages), ...createTmpListConfig()]);

// export default defineConfig(createTmpListConfig());
