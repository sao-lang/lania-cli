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
        const results = await linter.lintFiles(filePath);
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
        await traverseFiles(path, async (filePath) => {
            const ext = getFileExt(filePath) as EsLinterSupportFileType;
            if (
                (!fileTypes && this.lintFileTypes.includes(ext)) ||
                (fileTypes && fileTypes.includes(ext))
            ) {
                const result = await this.checkFile(filePath, linter);
                results.push(result);
            }
        });
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
        const configObject = await getModuleConfig(config);
        linter =
            linter ||
            new ESLint({
                overrideConfig: configObject,
                ignorePath: options?.ignorePath,
                fix: options?.fix,
            });
        for (const filePath of filePaths) {
            const stats = await stat(filePath);
            if (stats.isDirectory()) {
                const result = await this.checkDir(filePath, linter, options);
                results.push(result);
            } else {
                const result = await this.checkFile(filePath, linter);
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
        const configObject = await getModuleConfig(config);
        const linter = new ESLint({
            overrideConfig: configObject,
            ignorePath: options?.ignorePath,
            fix: options?.fix,
        });
        const results = await this.check(filePaths, configObject, options, linter);
        if (!options?.fix) {
            return results;
        }
        for (const result of results) {
            for (const { filePath, output, errorCount } of result) {
                if (!output || errorCount === 0) {
                    continue;
                }
                const content = await readFile(filePath, 'utf-8');
                const lintContent = await linter.lintText(content);
                const { output: lintOutput } = lintContent[0];
                lintOutput && (await writeFile(filePath, lintOutput, 'utf-8'));
            }
        }
        return results;
    }
}
