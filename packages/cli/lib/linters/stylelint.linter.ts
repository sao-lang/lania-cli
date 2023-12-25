import stylelint from 'stylelint';
import {
    getModuleConfig,
    traverseFiles,
    type LinterConfiguration,
    getFileExt,
} from './linter.util';
import { stat } from 'fs/promises';
import to from '@utils/to';
type StyleLinterCheckFileResult = {
    filePath: string;
    output: {
        description: string;
        line: number;
        endColumn: number;
        endLine: number;
        column: number;
        type: 'error' | 'warning';
    }[];
    errorCount: number;
    warningCount: number;
};
type StyleLinterHandleDirOptions = {
    fileTypes?: StyleLinterSupportFileType[];
    ignorePath?: string;
    fix?: boolean;
};
type StyleLinterSupportFileType = 'css' | 'styl' | 'sass' | 'less' | 'vue' | 'svelte' | 'astro';

const lintFunc = async (config: LinterConfiguration, options: StyleLinterHandleDirOptions = {}) => {
    const configObject = await getModuleConfig(config);
    return (filePath: string) =>
        stylelint.lint({ files: filePath, config: configObject, ...options });
};

export default class StyleLinter {
    private lintFileTypes = ['css', 'styl', 'sass', 'less', 'vue', 'svelte', 'astro'];
    private async checkFile(
        filePath: string,
        lint: (filePath: string) => Promise<stylelint.LinterResult>,
    ) {
        const lintResult = await lint(filePath);
        const {
            results: [result],
        } = lintResult;
        const { warnings, parseErrors } = result;
        const errorCount = parseErrors.length;
        const warningCount = warnings.length;
        return {
            filePath,
            output:
                warningCount === 0 && errorCount === 0
                    ? null
                    : [
                          ...warnings.map(({ line, endLine, column, endColumn, text }) => ({
                              line,
                              endLine,
                              endColumn,
                              description: text,
                              column,
                              type: 'warning',
                          })),
                          ...parseErrors.map(({ line, endLine, column, endColumn, text }) => ({
                              line,
                              endLine,
                              endColumn,
                              description: text,
                              column,
                              type: 'error',
                          })),
                      ],
            warningCount,
            errorCount,
        } as StyleLinterCheckFileResult;
    }
    private async checkDir(
        path: string,
        lint: (filePath: string) => Promise<stylelint.LinterResult>,
        options?: StyleLinterHandleDirOptions,
    ) {
        const { fileTypes } = options || {};
        const results: StyleLinterCheckFileResult[] = [];
        await traverseFiles(path, async (filePath) => {
            const ext = getFileExt(filePath) as StyleLinterSupportFileType;
            if (
                (!fileTypes && this.lintFileTypes.includes(ext)) ||
                (fileTypes && fileTypes.includes(ext))
            ) {
                const result = await this.checkFile(filePath, lint);
                results.push(result);
            }
        });
        return results;
    }
    public async check(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: StyleLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: StyleLinterCheckFileResult[][] = [];
        for (const filePath of filePaths) {
            const stats = await stat(filePath);
            if (stats.isDirectory()) {
                const result = await this.checkDir(
                    filePath,
                    await lintFunc(config, options),
                    options,
                );
                results.push(result);
            } else {
                const result = await this.checkFile(filePath, await lintFunc(config, options));
                results.push([result]);
            }
        }
        return results;
    }
    public async lint(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: StyleLinterHandleDirOptions,
    ) {
        const results = await this.check(filePaths, config, options);
        return results;
    }
}
