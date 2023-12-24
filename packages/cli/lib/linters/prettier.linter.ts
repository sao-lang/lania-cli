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
    const [getConfigErr, configObject] = await to(getModuleConfig(config));
    if (getConfigErr) {
        throw getConfigErr;
    }
    return (content: string, fileType: PrettierSupportFileType) => {
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        return prettier.check(content, { ...configObject, plugins, parser });
    };
};

const lintFormat = async (config: LinterConfiguration) => {
    const [getConfigErr, configObject] = await to(getModuleConfig(config));
    if (getConfigErr) {
        throw getConfigErr;
    }
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
        const [getConfigErr, configObject] = await to(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const plugins = transformPlugin(fileType);
        const parser = transformParser(fileType);
        const [formateErr, code] = await to(
            prettier.format(content, { ...configObject, parser, plugins }),
        );
        if (formateErr) {
            throw formateErr;
        }
        return code;
    }
    private async checkFile(
        filePath: string,
        lint: (content: string, fileType: PrettierSupportFileType) => Promise<boolean>,
    ) {
        const [readFileErr, fileContent] = await to(readFile(filePath, 'utf-8'));
        if (readFileErr) {
            throw readFileErr;
        }
        const fileType = getFileExt<PrettierSupportFileType>(filePath);
        const [checkErr, checkResult] = await to(lint(fileContent, fileType));
        if (checkErr) {
            throw checkErr;
        }
        return { filePath, isFormatted: checkResult };
    }
    private async checkDir(
        path: string,
        lint: (content: string, fileType: PrettierSupportFileType) => Promise<boolean>,
        options?: PrettierLinterHandleDirOptions,
    ) {
        const { fileTypes } = options || {};
        const results: PrettierLinterCheckFileResult[] = [];
        const [traverseFilesErr] = await to(
            traverseFiles(path, async (filePath: string) => {
                const ext = getFileExt(filePath) as PrettierSupportFileType;
                if (
                    (!fileTypes && this.handleFileTypes.includes(ext)) ||
                    (fileTypes && fileTypes.includes(ext))
                ) {
                    const [checkFileErr, result] = await to(this.checkFile(filePath, lint));
                    if (checkFileErr) {
                        throw checkFileErr;
                    }
                    results.push(result);
                }
            }),
        );
        if (traverseFilesErr) {
            throw traverseFilesErr;
        }
        return results;
    }
    private async formatFile(
        filePath: string,
        lint: (content: string, fileType: PrettierSupportFileType) => Promise<string>,
    ) {
        const fileType = getFileExt<PrettierSupportFileType>(filePath);
        const [readFileErr, fileContent] = await to(readFile(filePath, 'utf-8'));
        if (readFileErr) {
            throw readFileErr;
        }
        const [formatErr, formattedContent] = await to(lint(fileContent, fileType));
        if (formatErr) {
            throw formatErr;
        }
        const [writeFileErr] = await to(writeFile(filePath, formattedContent, 'utf-8'));
        if (writeFileErr) {
            throw writeFileErr;
        }
    }
    private async formateDir(
        path: string,
        lint: (content: string, fileType: PrettierSupportFileType) => Promise<string>,
        options?: PrettierLinterHandleDirOptions,
    ) {
        const { fileTypes } = options || {};
        const [traverseFilesErr] = await to(
            traverseFiles(path, async (filePath: string) => {
                const ext = getFileExt<PrettierSupportFileType>(filePath);
                if (
                    (!fileTypes && this.handleFileTypes.includes(ext)) ||
                    (fileTypes && fileTypes.includes(ext))
                ) {
                    const [formateFileErr] = await to(this.formatFile(filePath, lint));
                    if (formateFileErr) {
                        throw formateFileErr;
                    }
                }
            }),
        );
        if (traverseFilesErr) {
            throw traverseFilesErr;
        }
    }
    public async check(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: PrettierLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: PrettierLinterCheckFileResult[][] = [];
        for (const filePath of filePaths) {
            const [statErr, stats] = await to(stat(filePath));
            if (statErr) {
                throw statErr;
            }
            if (stats.isDirectory()) {
                const [checkDirErr, result] = await to(
                    this.checkDir(filePath, await lintCheck(config), options),
                );
                if (checkDirErr) {
                    throw checkDirErr;
                }
                results.push(result);
            } else {
                const [checkFileErr, result] = await to(
                    this.checkFile(filePath, await lintCheck(config)),
                );
                if (checkFileErr) {
                    throw checkFileErr;
                }
                results.push([result]);
            }
        }
        return results;
    }
    public async formate(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: PrettierLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        for (const filePath of filePaths) {
            const [statErr, stats] = await to(stat(filePath));
            if (statErr) {
                throw statErr;
            }
            if (stats.isDirectory()) {
                const [formateDirErr] = await to(
                    this.formateDir(filePath, await lintFormat(config), options),
                );
                if (formateDirErr) {
                    throw formateDirErr;
                }
            } else {
                const [formateFileErr] = await to(
                    this.formatFile(filePath, await lintFormat(config)),
                );
                if (formateFileErr) {
                    throw formateFileErr;
                }
            }
        }
    }
    public async lint(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: PrettierLinterHandleDirOptions & { write?: boolean },
    ) {
        const [checkErr, results] = await to(this.check(filePaths, config, options));
        if (checkErr) {
            throw checkErr;
        }
        let count = 0;
        if (options?.write) {
            for (const result of results) {
                for (const { filePath, isFormatted } of result) {
                    if (!isFormatted) {
                        count++;
                        const [formatErr] = await to(
                            this.formatFile(filePath, await lintFormat(config)),
                        );
                        if (formatErr) {
                            throw formatErr;
                        }
                    }
                }
            }
        }
        return count;
    }
}
