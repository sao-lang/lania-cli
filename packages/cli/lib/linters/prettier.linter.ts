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
    private static transformParser(fileType: PrettierSupportFileType) {
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
    }
    private static transformPlugin(fileType: PrettierSupportFileType) {
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
    }
    private static async getConfig(
        config: LinterConfiguration,
        fileType: PrettierSupportFileType,
        ignorePath?: string,
    ) {
        const plugins = this.transformPlugin(fileType);
        const parser = this.transformParser(fileType);
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        return { ...configObject, plugins, parser, ignorePath };
    }
    private async checkFile(filePath: string, config: LinterConfiguration, ignorePath?: string) {
        const fileType = getFileExt(filePath) as PrettierSupportFileType;
        const [getConfigErr, configObject] = await to(
            PrettierLinter.getConfig(config, fileType, ignorePath),
        );
        if (getConfigErr) {
            throw getConfigErr;
        }
        const [readFileErr, fileContent] = await to(readFile(filePath, 'utf-8'));
        if (readFileErr) {
            throw readFileErr;
        }
        const [checkErr, checkResult] = await to(prettier.check(fileContent, configObject));
        if (checkErr) {
            throw checkErr;
        }
        return { filePath, isFormatted: checkResult };
    }
    private async checkDir(
        path: string,
        config: LinterConfiguration,
        options?: PrettierLinterHandleDirOptions,
    ) {
        const { fileTypes, ignorePath } = options || {};
        const results: PrettierLinterCheckFileResult[] = [];
        const [traverseFilesErr] = await to(
            traverseFiles(path, async (filePath: string) => {
                const ext = getFileExt(filePath) as PrettierSupportFileType;
                if (
                    (!fileTypes && this.handleFileTypes.includes(ext)) ||
                    (fileTypes && fileTypes.includes(ext))
                ) {
                    const [checkFileErr, result] = await to(
                        this.checkFile(filePath, config, ignorePath),
                    );
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
    private async formatFile(filePath: string, config: LinterConfiguration, ignorePath?: string) {
        const fileType = getFileExt(filePath) as PrettierSupportFileType;
        const [getConfigErr, configObject] = await to(
            PrettierLinter.getConfig(config, fileType, ignorePath),
        );
        if (getConfigErr) {
            throw getConfigErr;
        }
        const [readFileErr, fileContent] = await to(readFile(filePath, 'utf-8'));
        if (readFileErr) {
            throw readFileErr;
        }
        const [formatErr, formattedContent] = await to(prettier.format(fileContent, configObject));
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
        config: LinterConfiguration,
        options?: PrettierLinterHandleDirOptions,
    ) {
        const { fileTypes, ignorePath } = options || {};
        const [traverseFilesErr] = await to(
            traverseFiles(path, async (filePath: string) => {
                const ext = getFileExt(filePath) as PrettierSupportFileType;
                if (
                    (!fileTypes && this.handleFileTypes.includes(ext)) ||
                    (fileTypes && fileTypes.includes(ext))
                ) {
                    const [formateFileErr] = await to(
                        this.formatFile(filePath, config, ignorePath),
                    );
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
                const [checkDirErr, result] = await to(this.checkDir(filePath, config, options));
                if (checkDirErr) {
                    throw checkDirErr;
                }
                results.push(result);
            } else {
                const [checkFileErr, result] = await to(this.checkFile(filePath, config));
                if (checkFileErr) {
                    throw checkFileErr;
                }
                results.push([result]);
            }
        }
        return results;
    }
    public static async formatContent(
        content: string,
        config: LinterConfiguration,
        fileType: PrettierSupportFileType,
    ) {
        const [getConfigErr, configObject] = await to(this.getConfig(config, fileType));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const [formateErr, code] = await to(prettier.format(content, configObject));
        if (formateErr) {
            throw formateErr;
        }
        return code;
    }
    public async formate(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: PrettierLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        for (const filePath of filePaths) {
            const [statErr, stats] = await to(stat(filePath));
            if (statErr) {
                throw statErr;
            }
            if (stats.isDirectory()) {
                const [formateDirErr] = await to(this.formateDir(filePath, configObject, options));
                if (formateDirErr) {
                    throw formateDirErr;
                }
            } else {
                const [formateFileErr] = await to(this.formatFile(filePath, configObject));
                if (formateFileErr) {
                    throw formateFileErr;
                }
            }
        }
    }
    public async lint(
        filePaths: string | string[],
        config: Record<string, any> | string,
        options?: PrettierLinterHandleDirOptions & { write?: boolean },
    ) {
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const [checkErr, results] = await to(this.check(filePaths, configObject, options));
        if (checkErr) {
            throw checkErr;
        }
        let count = 0;
        if (options?.write) {
            for (const result of results) {
                for (const { filePath, isFormatted } of result) {
                    if (!isFormatted) {
                        count++;
                        const [formatErr] = await to(this.formatFile(filePath, configObject));
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
