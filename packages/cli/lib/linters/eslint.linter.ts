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
    }[];
};
export default class EsLinter {
    private lintFileTypes = ['ts', 'tsx', 'js', 'jsx', 'vue', 'astro', 'svelte', 'cjs', 'mjs'];
    private async checkFile(
        filePath: string,
        config: LinterConfiguration,
        ignorePath?: string,
        fix?: boolean,
    ) {
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const linter = new ESLint({
            overrideConfig: configObject,
            ignorePath,
            fix,
        });
        const [lintFilesErr, results] = await to(linter.lintFiles(filePath));
        if (lintFilesErr) {
            throw lintFilesErr;
        }
        const { messages } = results[0];
        return {
            filePath,
            output:
                messages.length > 0
                    ? messages.map(({ message, line, endColumn, endLine, column }) => ({
                          description: message,
                          line,
                          endColumn,
                          endLine,
                          column,
                      }))
                    : null,
        } as EsLinterCheckFileResult;
    }
    private async checkDir(
        path: string,
        config: LinterConfiguration,
        options?: EsLinterHandleDirOptions,
    ) {
        const { fileTypes, ignorePath, fix } = options || {};
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const results: EsLinterCheckFileResult[] = [];
        const [traverseFilesErr] = await to(
            traverseFiles(path, async (filePath) => {
                const ext = getFileExt(filePath) as EsLinterSupportFileType;
                if (
                    (!fileTypes && this.lintFileTypes.includes(ext)) ||
                    (fileTypes && fileTypes.includes(ext))
                ) {
                    const [checkFileErr, result] = await to(
                        this.checkFile(filePath, configObject, ignorePath, fix),
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
    public async check(
        filePaths: string | string[],
        config: Record<string, any> | string,
        options?: EsLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: EsLinterCheckFileResult[][] = [];
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
                const [checkDirErr, result] = await to(
                    this.checkDir(filePath, configObject, options),
                );
                if (checkDirErr) {
                    throw checkDirErr;
                }
                results.push(result);
            } else {
                const [checkFileErr, result] = await to(
                    this.checkFile(filePath, configObject, options?.ignorePath, options?.fix),
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
        options?: EsLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const [checkErr, results] = await to(this.check(filePaths, configObject, options));
        if (checkErr) {
            throw checkErr;
        }
        for (const result of results) {
            for (const { filePath, output } of result) {
                if (!output) {
                    continue;
                }
                const [readFileErr, content] = await to(readFile(filePath, 'utf-8'));
                if (readFileErr) {
                    throw readFileErr;
                }
                const [lintErr, lintContent] = await to(
                    new ESLint({ overrideConfig: configObject, fix: options?.fix }).lintText(
                        content,
                    ),
                );
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
