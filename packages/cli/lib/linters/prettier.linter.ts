import ConfigurationLoader from '@lib/configuration/configuration.loader';
import to from '@utils/to';
import { readFile, readdir, stat } from 'fs/promises';
import { basename, join } from 'path';
import prettier from 'prettier';
import stylusSupremacy from 'prettier-plugin-stylus-supremacy';

// import stylusSupremacy from 'stylus-supremacy';

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
    | 'astro';

type PrettierConfig = Record<string, any> | string;

type PrettierLinterCheckDirOptions = { fileType: PrettierSupportFileType[] };

type PrettierLinterCheckFileOptions = { fileType: PrettierSupportFileType };

export default class PrettierLinter {
    private transformParser(fileType: PrettierSupportFileType) {
        switch (fileType) {
            case 'js':
            case 'jsx':
                return 'babel';
            case 'json':
                return 'json';
            case 'ts':
            case 'tsx':
                return 'babel-ts';
            case 'css':
                return 'css';
            case 'svelte':
            case 'astro':
            case 'html':
                return 'html';
            case 'vue':
                return 'vue';
            case 'scss':
                return 'scss';
            case 'less':
                return 'less';
            case 'md':
                return 'markdown';
            case 'yaml':
                return 'yaml';
            default:
                return undefined;
        }
    }
    private getConfig(config: PrettierConfig) {
        const configLoader = new ConfigurationLoader();
        return typeof config === 'string' ? configLoader.load('prettier', config) : config;
    }
    private async checkFile(
        filePath: string,
        config: PrettierConfig,
        { fileType }: PrettierLinterCheckFileOptions,
    ) {
        const parser = this.transformParser(fileType);
        const configObject = this.getConfig(config);
        const [readFileErr, fileContent] = await to(readFile(filePath, 'utf-8'));
        if (readFileErr) {
            throw readFileErr;
        }
        const [checkErr, checkResult] = await to(
            prettier.check(fileContent, {
                ...configObject,
                parser,
                plugins: fileType === 'styl' && [stylusSupremacy],
            }),
        );
        if (checkErr) {
            throw checkErr;
        }
        return { filePath, isFormatted: checkResult };
    }
    private async checkDir(
        path: string,
        config: PrettierConfig,
        { fileType }: PrettierLinterCheckDirOptions,
    ) {
        const results: { filePath: string; isFormatted: boolean }[] = [];
        const traverseFiles = async (dir: string) => {
            const [readdirErr, files] = await to(readdir(dir));
            if (readdirErr) {
                throw readdirErr;
            }
            for (const file of files) {
                const filePath = join(dir, file);
                const [statErr, stats] = await to(stat(filePath));
                if (statErr) {
                    throw statErr;
                }
                if (stats.isDirectory()) {
                    traverseFiles(filePath);
                } else if (
                    stats.isFile() &&
                    fileType.includes(basename(filePath) as PrettierSupportFileType)
                ) {
                    const [checkFileErr, result] = await to(
                        this.checkFile(filePath, config, {
                            fileType: basename(filePath) as PrettierSupportFileType,
                        }),
                    );
                    if (checkFileErr) {
                        throw checkFileErr;
                    }
                    results.push(result);
                }
            }
        };
        traverseFiles(path);
        return results;
    }
    public async check(
        filePath: string,
        config: Record<string, any> | string,
        options: { fileType: PrettierSupportFileType[] },
    ) {
        const [statErr, stats] = await to(stat(filePath));
        if (statErr) {
            throw statErr;
        }
        if (stats.isDirectory()) {
            const [checkDirErr, results] = await to(this.checkDir(filePath, config, options));
            if (checkDirErr) {
                throw checkDirErr;
            }
            return results;
        } else {
            const [checkFileErr, result] = await to(
                this.checkFile(filePath, config, { fileType: options.fileType[0] }),
            );
            if (checkFileErr) {
                throw checkFileErr;
            }
            return [result];
        }
    }
    public async format(content: string) {}
    public async lint(filePath: string) {}
}
