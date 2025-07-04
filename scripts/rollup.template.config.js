import path from 'path';
import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern, BUILD_CONFIG_MAP } from './utils.js';
import * as glob from 'glob';

const resolveSubPath = (subPath) => {
    return resolvePath(BUILD_CONFIG_MAP.templates.value, subPath);
};

const createConfig = () => {
    return [
        {
            input: resolveSubPath('src/index.ts'),
            output: {
                dir: resolveSubPath('dist'),
                format: 'es',
                preserveModules: true,
            },
            external: resolveExtern(BUILD_CONFIG_MAP.templates.value),
            plugins: resolvePlugins(BUILD_CONFIG_MAP.templates.value),
            onwarn(warning, warn) {
                if (warning.code === 'MIXED_EXPORTS') return;
                warn(warning);
            },
        },
    ];
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
            external: resolveExtern(BUILD_CONFIG_MAP.templates.value),
            plugins: resolvePlugins(BUILD_CONFIG_MAP.templatesTmps.value),
        };
    });
};
export default defineConfig([...createConfig(), ...createTemplateFileConfig()]);
