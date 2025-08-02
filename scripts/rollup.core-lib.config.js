// rollup.config.js
import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolvedExterns, BUILD_CONFIG_MAP } from './utils.js';

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
        external: resolvedExterns,
        plugins: resolvePlugins(pkg),
        onwarn(warning, warn) {
            if (warning.code === 'MIXED_EXPORTS') return;
            warn(warning);
        },
    };
};

export default defineConfig([...packages.map(createPackageConfig)]);
