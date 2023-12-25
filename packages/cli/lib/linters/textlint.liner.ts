import { createLinter, loadTextlintrc } from 'textlint';
import {
    getModuleConfig,
    traverseFiles,
    type LinterConfiguration,
    getFileExt,
} from './linter.util';
import { stat } from 'fs/promises';

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
        const result = await linter.lintFiles([filePath]);
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
        await traverseFiles(path, async (filePath) => {
            const ext = getFileExt(filePath) as TextLinterSupportFileType;
            if (
                (!fileTypes && this.handleFileTypes.includes(ext)) ||
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
        options?: TextLinterHandleDirOptions,
        linter?: ReturnType<typeof createLinter>,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: TextLinterCheckFileResult[][] = [];
        for (const filePath of filePaths) {
            const stats = await stat(filePath);
            const configObject = await getModuleConfig(config);
            linter =
                linter ||
                createLinter({
                    ignoreFilePath: options.ignorePath,
                    descriptor: await loadTextlintrc(configObject),
                });
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
        options?: TextLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const configObject = await getModuleConfig(config);
        const linter = createLinter({
            ignoreFilePath: options.ignorePath,
            descriptor: await loadTextlintrc(configObject),
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
                await linter.lintFiles([filePath]);
            }
        }
        return results;
    }
}
