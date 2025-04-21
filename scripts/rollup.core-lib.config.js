// rollup.config.js
import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern } from './utils.js';

const packages = [
    'compilers',
    'linters',
    'command-add',
    'command-sync',
    'command-build',
    'command-create',
    'command-dev',
    'command-lint'
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

export default defineConfig(packages.map(createPackageConfig));
