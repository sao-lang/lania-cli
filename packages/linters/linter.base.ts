import { stat } from 'fs/promises';
import {
    getEslintConfig,
    getFileExt,
    getLanConfig,
    getPrettierConfig,
    getStylelintConfig,
    getTextlintConfig,
    traverseFiles,
} from '@lania-cli/common';
import { ConfigurationGetType, LinterHandleDirOptions } from '@lania-cli/types';
import { getFileTypes } from './helper';

export default abstract class Linter<
    SupportFileType extends string,
    LintOutput extends Record<string, any>,
    Base extends Record<string, any>,
> {
    protected options: LinterHandleDirOptions;
    private baseConfig: Record<string, any>;
    protected abstract lintFile(path: string): Promise<LintOutput>;
    protected fileTypes: SupportFileType[];
    private linterType: string;
    protected base: Base;
    constructor(options = {}, linterType: string, base: Base) {
        this.options = options;
        this.fileTypes = getFileTypes(linterType) as SupportFileType[];
        this.base = base;
        this.linterType = linterType;
    }
    public async lintDir(dir: string) {
        const results: LintOutput[] = [];
        const defaultIgnoreDirs = [
            'node_modules',
            '.git',
            '.vscode',
            '.idea',
            '.husky',
            '.changeset',
            'dist',
            'build',
            'coverage',
            '.cache',
            'logs',
            'tmp',
            'temp',
            '.output',
            '.next',
            '.nuxt',
            '.vite',
            '.svelte-kit',
            '.storybook',
            '.parcel-cache',
            'out',
            '__tests__',
            '__mocks__',
        ];

        await traverseFiles(
            dir,
            async (filePath) => {
                const ext = getFileExt(filePath);
                if (this.fileTypes.includes(ext as SupportFileType)) {
                    results.push(await this.lintFile(filePath));
                }
            },
            {
                rootDir: process.cwd(),
                ignoreFilePath: this.options.ignorePath,
                ignorePatterns: defaultIgnoreDirs,
            },
            (filePath: string) => this.fileTypes.includes(getFileExt(filePath)),
        );
        return results;
    }
    public async lint(filePaths: string) {
        const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: LintOutput[][] = [];
        for (const path of paths) {
            const stats = await stat(path);
            const isDirectory = stats.isDirectory();
            if (isDirectory) {
                await this.lintDir(path);
            }
            const result = isDirectory ? await this.lintDir(path) : [await this.lintFile(path)];
            results.push(result);
        }
        return results;
    }
    protected getBaseConfig(config: ConfigurationGetType) {
        if (this.baseConfig) {
            return this.baseConfig;
        }
        const loaders = {
            stylelint: getStylelintConfig,
            prettier: getPrettierConfig,
            eslint: getEslintConfig,
            textlint: getTextlintConfig,
        };
        this.baseConfig = loaders[this.linterType]?.(config) ?? {};
        return this.baseConfig;
    }
}
