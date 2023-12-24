import { createLinter, loadTextlintrc } from 'textlint';
import {
    getModuleConfig,
    traverseFiles,
    type LinterConfiguration,
    getFileExt,
} from './linter.util';
import to from '@utils/to';
import { readFile, stat, writeFile } from 'fs/promises';

type TextLinterCheckFileResult = {
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
type TextLinterHandleDirOptions = {
    fileTypes?: TextLinterSupportFileType[];
    ignorePath?: string;
    fix?: boolean;
};
type TextLinterSupportFileType = 'txt' | 'md';
export class TextLinter {
    private handleFileTypes = ['md', 'txt'];
    private async checkFile(filePath: string, linter: ReturnType<typeof createLinter>) {
        const [lintErr, result] = await to(linter.lintFiles([filePath]));
        if (lintErr) {
            throw lintErr;
        }
        const output = result[0].messages
            .filter(({ severity }) => [1, 2].includes(severity))
            .map(({ loc, message, severity }) => ({
                column: loc.start.column,
                line: loc.start.line,
                endColumn: loc.end.column,
                endLine: loc.end.line,
                description: message,
                type: severity === 2 ? 'error' : 'warning',
            }));
        return {
            filePath,
            output: output.length === 0 ? null : output,
            errorCount: output.filter(({ type }) => type === 'error').length,
            warningCount: output.filter(({ type }) => type === 'warning').length,
        } as TextLinterCheckFileResult;
    }
    private async checkDir(
        path: string,
        linter: ReturnType<typeof createLinter>,
        options?: TextLinterHandleDirOptions,
    ) {
        const results: TextLinterCheckFileResult[] = [];
        const { fileTypes } = options || {};
        const [traverseFilesErr] = await to(
            traverseFiles(path, async (filePath) => {
                const ext = getFileExt(filePath) as TextLinterSupportFileType;
                if (
                    (!fileTypes && this.handleFileTypes.includes(ext)) ||
                    (fileTypes && fileTypes.includes(ext))
                ) {
                    const [checkFileErr, result] = await to(this.checkFile(filePath, linter));
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
        options?: TextLinterHandleDirOptions,
        linter?: ReturnType<typeof createLinter>,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: TextLinterCheckFileResult[][] = [];
        for (const filePath of filePaths) {
            const [statErr, stats] = await to(stat(filePath));
            if (statErr) {
                throw statErr;
            }
            const [getConfigErr, configObject] = await to<Record<string, any>>(
                getModuleConfig(config),
            );
            if (getConfigErr) {
                throw getConfigErr;
            }
            const textLinter =
                linter ||
                createLinter({
                    ignoreFilePath: options.ignorePath,
                    descriptor: await loadTextlintrc(configObject),
                });
            if (stats.isDirectory()) {
                const [checkDirErr, result] = await to(
                    this.checkDir(filePath, textLinter, options),
                );
                if (checkDirErr) {
                    throw checkDirErr;
                }
                results.push(result);
            } else {
                const [checkFileErr, result] = await to(this.checkFile(filePath, textLinter));
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
        options?: TextLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const linter = createLinter({
            ignoreFilePath: options.ignorePath,
            descriptor: await loadTextlintrc(configObject),
        });
        const [checkErr, results] = await to(this.check(filePaths, configObject, options, linter));
        if (checkErr) {
            throw checkErr;
        }
        if (!options?.fix) {
            return results;
        }
        for (const result of results) {
            for (const { filePath, output, errorCount } of result) {
                if (!output || errorCount === 0) {
                    continue;
                }
                const [lintErr] = await to(linter.fixFiles([filePath]));
                if (lintErr) {
                    throw lintErr;
                }
                // const { output: lintOutput, source } = lintContent[0];
                // const [writeFileErr] = await to(writeFile(filePath, lintOutput || source, 'utf-8'));
                // if (writeFileErr) {
                //     throw writeFileErr;
                // }
            }
        }
        return results;
    }
}
