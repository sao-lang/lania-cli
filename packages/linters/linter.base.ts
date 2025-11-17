import { stat } from 'fs/promises';
import { getFileExt, getLanConfig, traverseFiles } from '@lania-cli/common';
import { LinterHandleDirOptions } from '@lania-cli/types';

export default abstract class Linter<
    SupportFileType extends string,
    LintOutput extends Record<string, any>,
    Base extends Record<string, any>,
> {
    protected options: LinterHandleDirOptions;
    protected abstract lintFile(path: string): Promise<LintOutput>;
    protected abstract fileTypes: SupportFileType[];
    protected abstract base: Base;
    constructor(options = {}) {
        this.setBase();
        this.options = options;
    }

    private async setBase() {
        const config = await getLanConfig();
        if (config?.dependencies) {
            this.base = config?.dependencies as Base;
        }
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
}
