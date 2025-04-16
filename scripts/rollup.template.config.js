import path from 'path';
import { defineConfig } from 'rollup';
import { resolvePath, resolvePlugins, resolveExtern } from './utils.js';
import * as glob from 'glob';

const resolveSubPath = (subPath) => {
    return resolvePath('templates', subPath);
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
            external: resolveExtern('templates'),
            plugins: resolvePlugins('template'),
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
            external: resolveExtern('templates'),
            plugins: resolvePlugins('templates'),
        };
    });
};
export default defineConfig([...createConfig(), ...createTemplateFileConfig()]);
