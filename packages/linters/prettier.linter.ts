import Linter from './linter.base';
import { getFileExt, getPrettierConfig } from '@lania-cli/common';

import prettier from 'prettier';
import stylus from 'prettier-plugin-stylus';
import ejs from 'prettier-plugin-ejs';
import svelte from 'prettier-plugin-svelte';
import { readFile, writeFile } from 'fs/promises';
import {
    ConfigurationGetType,
    LinterHandleDirOptions,
    PrettierOutput,
    PrettierSupportFileType,
} from '@lania-cli/types';
import { getFileTypes } from './helper';

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

export class Prettier extends Linter<PrettierSupportFileType, PrettierOutput, typeof prettier> {
    private config: ConfigurationGetType;
    protected fileTypes = getFileTypes('prettier') as PrettierSupportFileType[];
    protected base: typeof prettier;
    constructor(config: ConfigurationGetType = 'prettier', options?: LinterHandleDirOptions) {
        super(options);
        this.config = config;
        this.base = options?.outerLinter ?? prettier;
    }
    public async lintFile(path: string) {
        const configObject = await getPrettierConfig(this.config);
        const fileType = getFileExt<PrettierSupportFileType>(path);
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        const content = await readFile(path, 'utf-8');
        const isFormatted = await this.base.check(content, {
            parser,
            plugins,
            ...configObject,
        });
        if (!isFormatted && this.options?.fix) {
            const code = await this.base.format(content, {
                parser,
                plugins,
                ...configObject,
            });
            await writeFile(path, code, 'utf-8');
        }
        if (this.options?.fix) {
            return { filePath: path, lintType: 'prettier' };
        }
        return {
            filePath: path,
            isFormatted,
            lintType: 'prettier',
        };
    }
    public async formatContent(
        content: string,
        config: ConfigurationGetType,
        fileType: PrettierSupportFileType,
    ) {
        if (!this.fileTypes.includes(fileType)) {
            return content;
        }
        const configObject = await getPrettierConfig(config);
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        const code = await this.base.format(content, { ...configObject, plugins, parser });
        return code;
    }
}

export default Prettier;
