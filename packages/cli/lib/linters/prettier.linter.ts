import to from '@utils/to';
import { readFile, stat, writeFile } from 'fs/promises';
import prettier from 'prettier';
import stylus from 'prettier-plugin-stylus';
import ejs from 'prettier-plugin-ejs';
import svelte from 'prettier-plugin-svelte';
import {
    type LinterConfiguration,
    getModuleConfig,
    traverseFiles,
    getFileExt,
} from '@linters/linter.util';

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

type PrettierLinterHandleDirOptions = {
    fileTypes?: PrettierSupportFileType[];
    ignorePath?: string;
};

type PrettierLinterCheckFileResult = {
    filePath: string;
    isFormatted: boolean;
};

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
            return stylus;
        case 'ejs':
            return ejs;
        case 'svelte':
            return svelte;
        default:
            return undefined;
    }
};

const lintCheck = async (config: LinterConfiguration) => {
    const configObject = await getModuleConfig(config);
    return (content: string, fileType: PrettierSupportFileType) => {
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        return prettier.check(content, { ...configObject, plugins, parser });
    };
};

const lintFormat = async (config: LinterConfiguration) => {
    const configObject = await getModuleConfig(config);
    return (content: string, fileType: PrettierSupportFileType) => {
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        return prettier.format(content, { ...configObject, plugins, parser });
    };
};

export default class PrettierLinter {
    private handleFileTypes = [
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
    public static listFileTypes() {
        return [
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
    private async checkFile(
        filePath: string,
        lint: (content: string, fileType: PrettierSupportFileType) => Promise<boolean>,
    ) {
        const fileContent = await readFile(filePath, 'utf-8');
        const fileType = getFileExt<PrettierSupportFileType>(filePath);
        const checkResult = await lint(fileContent, fileType);
        return { filePath, isFormatted: checkResult };
    }
    private async checkDir(
        path: string,
        lint: (content: string, fileType: PrettierSupportFileType) => Promise<boolean>,
        options?: PrettierLinterHandleDirOptions,
    ) {
        const { fileTypes } = options || {};
        const results: PrettierLinterCheckFileResult[] = [];
        await traverseFiles(path, async (filePath: string) => {
            const ext = getFileExt(filePath) as PrettierSupportFileType;
            if (
                (!fileTypes && this.handleFileTypes.includes(ext)) ||
                (fileTypes && fileTypes.includes(ext))
            ) {
                const result = await this.checkFile(filePath, lint);
                results.push(result);
            }
        });
        return results;
    }
    private async formatFile(
        filePath: string,
        lint: (content: string, fileType: PrettierSupportFileType) => Promise<string>,
    ) {
        const fileType = getFileExt<PrettierSupportFileType>(filePath);
        const fileContent = await readFile(filePath, 'utf-8');
        const formattedContent = await lint(fileContent, fileType);
        await writeFile(filePath, formattedContent, 'utf-8');
    }
    private async formatDir(
        path: string,
        lint: (content: string, fileType: PrettierSupportFileType) => Promise<string>,
        options?: PrettierLinterHandleDirOptions,
    ) {
        const { fileTypes } = options || {};
        await traverseFiles(path, async (filePath: string) => {
            const ext = getFileExt<PrettierSupportFileType>(filePath);
            if (
                (!fileTypes && this.handleFileTypes.includes(ext)) ||
                (fileTypes && fileTypes.includes(ext))
            ) {
                await this.formatFile(filePath, lint);
            }
        });
    }
    public async check(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: PrettierLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: PrettierLinterCheckFileResult[][] = [];
        for (const filePath of filePaths) {
            const stats = await stat(filePath);
            if (stats.isDirectory()) {
                const result = await this.checkDir(filePath, await lintCheck(config), options);
                results.push(result);
            } else {
                const result = await this.checkFile(filePath, await lintCheck(config));
                results.push([result]);
            }
        }
        return results;
    }
    public async format(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: PrettierLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        for (const filePath of filePaths) {
            const stats = await stat(filePath);
            if (stats.isDirectory()) {
                await this.formatDir(filePath, await lintFormat(config), options);
            } else {
                await this.formatFile(filePath, await lintFormat(config));
            }
        }
    }
    public async lint(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: PrettierLinterHandleDirOptions & { write?: boolean },
    ) {
        const results = await this.check(filePaths, config, options);
        let count = 0;
        if (options?.write) {
            for (const result of results) {
                for (const { filePath, isFormatted } of result) {
                    if (!isFormatted) {
                        count++;
                        await this.formatFile(filePath, await lintFormat(config));
                    }
                }
            }
        }
        return count;
    }
}
