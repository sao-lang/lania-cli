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
    const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
    if (getConfigErr) {
        throw getConfigErr;
    }
    return (filePath: string) =>
        stylelint.lint({ files: filePath, config: configObject, ...options });
};

export default class StyleLinter {
    private lintFileTypes = ['css', 'styl', 'sass', 'less', 'vue', 'svelte', 'astro'];
    private async checkFile(
        filePath: string,
        lint: (filePath: string) => Promise<stylelint.LinterResult>,
    ) {
        const [lintErr, lintResult] = await to(lint(filePath));
        if (lintErr) {
            throw lintErr;
        }
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
        const [traverseFilesErr] = await to(
            traverseFiles(path, async (filePath) => {
                const ext = getFileExt(filePath) as StyleLinterSupportFileType;
                if (
                    (!fileTypes && this.lintFileTypes.includes(ext)) ||
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
    public async check(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: StyleLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: StyleLinterCheckFileResult[][] = [];
        for (const filePath of filePaths) {
            const [statErr, stats] = await to(stat(filePath));
            if (statErr) {
                throw statErr;
            }
            if (stats.isDirectory()) {
                const [checkDirErr, result] = await to(
                    this.checkDir(filePath, await lintFunc(config, options), options),
                );
                if (checkDirErr) {
                    throw checkDirErr;
                }
                results.push(result);
            } else {
                const [checkFileErr, result] = await to(
                    this.checkFile(filePath, await lintFunc(config, options)),
                );

                if (checkFileErr) {
                    throw checkFileErr;
                }
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
        const [checkErr, results] = await to(this.check(filePaths, config, options));
        if (checkErr) {
            throw checkErr;
        }
        return results;
    }
}
