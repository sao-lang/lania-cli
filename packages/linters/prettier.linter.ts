import Linter from './linter.base';
import { getModuleConfig } from './linter.util';
import { getFileExt } from '@lania-cli/common';

import prettier from 'prettier';
import stylus from 'prettier-plugin-stylus';
import ejs from 'prettier-plugin-ejs';
import svelte from 'prettier-plugin-svelte';
import { readFile, writeFile } from 'fs/promises';
import {
    LinterConfiguration,
    LinterHandleDirOptions,
    PrettierOutput,
    PrettierSupportFileType,
} from '@lania-cli/types';

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

export class Prettier extends Linter<PrettierSupportFileType, PrettierOutput> {
    private config: LinterConfiguration;
    private options: LinterHandleDirOptions;
    protected fileTypes: PrettierSupportFileType[];
    constructor(config: LinterConfiguration, options?: LinterHandleDirOptions) {
        super();
        this.config = config;
        this.options = options;
        this.fileTypes = Prettier.listFileTypes();
    }
    public async lintFile(path: string) {
        const configObject = getModuleConfig(this.config);
        const fileType = getFileExt<PrettierSupportFileType>(path);
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        const content = await readFile(path, 'utf-8');
        const isFormatted = await prettier.check(content, {
            parser,
            plugins,
            ...configObject,
        });
        if (!isFormatted && this.options?.fix) {
            const code = await prettier.format(content, {
                parser,
                plugins,
                ...configObject,
            });
            await writeFile(path, code, 'utf-8');
        }
        if (this.options?.fix) {
            return { filePath: path };
        }
        return {
            filePath: path,
            isFormatted,
        };
    }

    public static listFileTypes() {
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
    }
    public static async formatContent(
        content: string,
        config: LinterConfiguration,
        fileType: PrettierSupportFileType,
    ) {
        if (!Prettier.listFileTypes().includes(fileType)) {
            return content;
        }
        const configObject = await getModuleConfig(config);
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        const code = await prettier.format(content, { ...configObject, plugins, parser });
        return code;
    }
}

export default Prettier;