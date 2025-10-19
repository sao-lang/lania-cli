import Linter from './linter.base';
import { getFileExt, getLinterModuleConfig } from '@lania-cli/common';

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

export class Prettier extends Linter<
    PrettierSupportFileType,
    PrettierOutput,
    { prettier: typeof prettier }
> {
    private config: LinterConfiguration;
    protected fileTypes: PrettierSupportFileType[];
    protected base = { prettier };
    constructor(config: LinterConfiguration = 'prettier', options?: LinterHandleDirOptions) {
        super(options, (filePath) => this.getFileTypes().includes(getFileExt(filePath)));
        this.config = config;
        this.fileTypes = this.getFileTypes();
    }
    public async lintFile(path: string) {
        const configObject = await getLinterModuleConfig(this.config);
        console.log(configObject, 'configObject');
        const fileType = getFileExt<PrettierSupportFileType>(path);
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        const content = await readFile(path, 'utf-8');
        const isFormatted = await this.base.prettier.check(content, {
            parser,
            plugins,
            ...configObject,
        });
        if (!isFormatted && this.options?.fix) {
            const code = await this.base.prettier.format(content, {
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
    private getFileTypes() {
        return getFileTypes('prettier') as PrettierSupportFileType[];
    }
    public async formatContent(
        content: string,
        config: LinterConfiguration,
        fileType: PrettierSupportFileType,
    ) {
        if (!this.getFileTypes().includes(fileType)) {
            return content;
        }
        const configObject = await getLinterModuleConfig(config);
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        const code = await this.base.prettier.format(content, { ...configObject, plugins, parser });
        return code;
    }
}

export default Prettier;
