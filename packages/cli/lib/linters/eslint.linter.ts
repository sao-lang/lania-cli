import to from '@utils/to';
import { ESLint } from 'eslint';
import {
    type LinterConfiguration,
    getModuleConfig,
    traverseFiles,
    getFileExt,
} from './linter.util';
import { readFile, stat, writeFile } from 'fs/promises';
type EsLinterSupportFileType =
    | 'ts'
    | 'tsx'
    | 'js'
    | 'jsx'
    | 'vue'
    | 'astro'
    | 'svelte'
    | 'cjs'
    | 'mjs';
type EsLinterHandleDirOptions = {
    fileTypes?: EsLinterSupportFileType[];
    ignorePath?: string;
    fix?: boolean;
};
type EsLinterCheckFileResult = {
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
export default class EsLinter {
    private lintFileTypes = ['ts', 'tsx', 'js', 'jsx', 'vue', 'astro', 'svelte', 'cjs', 'mjs'];
    private async checkFile(filePath: string, linter: ESLint) {
        const [lintFilesErr, results] = await to(linter.lintFiles(filePath));
        if (lintFilesErr) {
            throw lintFilesErr;
        }
        const { messages, errorCount, warningCount } = results[0];
        const output = messages.map(({ message, line, endColumn, endLine, column, severity }) => ({
            description: message,
            line,
            endColumn,
            endLine,
            column,
            type: severity === 0 ? 'error' : 'warning',
        }));
        return {
            filePath,
            output: output.length === 0 ? null : output,
            errorCount,
            warningCount,
        } as EsLinterCheckFileResult;
    }
    private async checkDir(path: string, linter: ESLint, options?: EsLinterHandleDirOptions) {
        const { fileTypes } = options || {};
        const results: EsLinterCheckFileResult[] = [];
        const [traverseFilesErr] = await to(
            traverseFiles(path, async (filePath) => {
                const ext = getFileExt(filePath) as EsLinterSupportFileType;
                if (
                    (!fileTypes && this.lintFileTypes.includes(ext)) ||
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
        options?: EsLinterHandleDirOptions,
        linter?: ESLint,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: EsLinterCheckFileResult[][] = [];
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        linter =
            linter ||
            new ESLint({
                overrideConfig: configObject,
                ignorePath: options?.ignorePath,
                fix: options?.fix,
            });
        for (const filePath of filePaths) {
            const [statErr, stats] = await to(stat(filePath));
            if (statErr) {
                throw statErr;
            }
            if (stats.isDirectory()) {
                const [checkDirErr, result] = await to(this.checkDir(filePath, linter, options));
                if (checkDirErr) {
                    throw checkDirErr;
                }
                results.push(result);
            } else {
                const [checkFileErr, result] = await to(this.checkFile(filePath, linter));
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
        options?: EsLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const linter = new ESLint({
            overrideConfig: configObject,
            ignorePath: options?.ignorePath,
            fix: options?.fix,
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
                const [readFileErr, content] = await to(readFile(filePath, 'utf-8'));
                if (readFileErr) {
                    throw readFileErr;
                }
                const [lintErr, lintContent] = await to(linter.lintText(content));
                if (lintErr) {
                    throw lintErr;
                }
                const { output: lintOutput, source } = lintContent[0];
                const [writeFileErr] = await to(writeFile(filePath, lintOutput || source, 'utf-8'));
                if (writeFileErr) {
                    throw writeFileErr;
                }
            }
        }
        return results;
    }
}
