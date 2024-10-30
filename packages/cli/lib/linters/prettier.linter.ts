import Linter from './linter.base';
import { type LinterConfiguration, getFileExt, getModuleConfig } from './linter.util';

import { readFile, writeFile } from 'fs/promises';
import prettier from 'prettier';
import stylus from 'prettier-plugin-stylus';
import ejs from 'prettier-plugin-ejs';
import svelte from 'prettier-plugin-svelte';

export type PrettierSupportFileType =
    | 'js'
    | 'json'
    | 'ts'
    | 'jsx'
    | 'tsx'
    | 'vue'
    | 'svelte'
    | 'css'
    | 'html'
    | 'scss'
    | 'less'
    | 'styl'
    | 'md'
    | 'yaml'
    | 'astro'
    | 'yml'
    | 'ejs';

const transformParser = (fileType: PrettierSupportFileType) => {
    switch (fileType) {
        case 'js':
        case 'jsx':
            return 'babel';
        case 'ts':
        case 'tsx':
            return 'babel-ts';
        case 'astro':
            return 'html';
        case 'md':
            return 'markdown';
        case 'yml':
            return 'yaml';
        case 'styl':
            return 'stylus';
        default:
            return fileType;
    }
};

const transformPlugin = (fileType: PrettierSupportFileType) => {
    switch (fileType) {
        case 'styl':
            return [stylus];
        case 'ejs':
            return [ejs];
        case 'svelte':
            return [svelte];
        default:
            return undefined;
    }
};

const getLintFileTypes = () => {
    const fileTypes = [
        'js',
        'json',
        'ts',
        'jsx',
        'tsx',
        'vue',
        'svelte',
        'css',
        'html',
        'scss',
        'less',
        'styl',
        'md',
        'yaml',
        'astro',
        'yml',
        'ejs',
    ];
    return fileTypes as PrettierSupportFileType[];
};
export default class PrettierLinter extends Linter {
    constructor() {
        const linter = {
            fileTypes: getLintFileTypes(),
            lint: (async (config: LinterConfiguration) =>
                this.createLintFn(config, false)) as unknown as () => Promise<
                (path: string) => Promise<{
                    filePath: string;
                    isFormatted: boolean;
                }>
            >,
            fix: (async (config: LinterConfiguration) =>
                this.createLintFn(config, true)) as unknown as () => Promise<
                (path: string) => Promise<{
                    filePath: string;
                }>
            >,
        };
        super(linter);
    }
    private createLintFn(config: LinterConfiguration, isFixedMode: boolean) {
        return async () => {
            const configObject = getModuleConfig(config);
            return async (path: string) => {
                const fileType = getFileExt<PrettierSupportFileType>(path);
                const plugins = transformPlugin(fileType);
                const parser = transformParser(fileType);
                const content = await readFile(path, 'utf-8');
                const isFormatted = await prettier.check(content, {
                    parser,
                    plugins,
                    ...configObject,
                });
                if (!isFormatted && isFixedMode) {
                    const code = await prettier.format(content, {
                        parser,
                        plugins,
                        ...configObject,
                    });
                    await writeFile(path, code, 'utf-8');
                }
                if (isFixedMode) {
                    return { filePath: path };
                }
                return {
                    filePath: path,
                    isFormatted,
                };
            };
        };
    }
    public static listFileTypes() {
        return getLintFileTypes();
    }
    public static async formatContent(
        content: string,
        config: LinterConfiguration,
        fileType: PrettierSupportFileType,
    ) {
        const configObject = await getModuleConfig(config);
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        const code = await prettier.format(content, { ...configObject, plugins, parser });
        return code;
    }
}
