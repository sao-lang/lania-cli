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

export default class PrettierLinter extends Linter {
    constructor() {
        const linter = {
            fileTypes: [
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
            ] as PrettierSupportFileType[],
            lint: async (config: LinterConfiguration) => {
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
                    return {
                        filePath: path,
                        isFormatted,
                    };
                };
            },
            fix: async (config: LinterConfiguration) => {
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
                    if (!isFormatted) {
                        const code = await prettier.format(content, {
                            parser,
                            plugins,
                            ...configObject,
                        });
                        await writeFile(path, code, 'utf-8');
                    }
                    return { filePath: path };
                };
            },
        };
        super(linter);
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
