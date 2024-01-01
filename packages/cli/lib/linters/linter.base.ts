import { stat } from 'fs/promises';
import { LinterConfiguration, getFileExt, traverseFiles } from './linter.util';

export type LinterLintFileResult =
    | {
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
      }
    | { filePath: string; isFormatted?: boolean };
export interface LinterHandleDirOptions {
    fix?: boolean;
    ignorePath?: string;
    fileTypes?: string[];
}
export interface LinterInterface {
    fix: (
        config: LinterConfiguration,
        options?: LinterHandleDirOptions,
    ) => Promise<(path: string) => Promise<LinterLintFileResult>>;
    lint: (
        config: LinterConfiguration,
        options?: LinterHandleDirOptions,
    ) => Promise<(path: string) => Promise<LinterLintFileResult>>;
    fileTypes: string[];
}
export default class Linter {
    private linter: LinterInterface;
    constructor(linter: LinterInterface) {
        this.linter = linter;
    }
    private async lintDir(
        path: string,
        options: LinterHandleDirOptions,
        lint: (path: string) => Promise<LinterLintFileResult>,
    ) {
        const { fileTypes } = options || {};
        const results: LinterLintFileResult[] = [];
        await traverseFiles(path, async (filePath) => {
            const ext = getFileExt(filePath);
            if (
                (!fileTypes && this.linter.fileTypes.includes(ext)) ||
                (fileTypes && fileTypes.includes(ext))
            ) {
                const result = await lint(path);
                results.push(result);
            }
        });
        return results;
    }
    public async lint(
        filePaths: string[] | string,
        config: LinterConfiguration,
        options: LinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const { fix } = options || {};
        const lintFuncWrapper = async () => {
            const lintFuncer = fix
                ? await this.linter.fix(config, options)
                : await this.linter.lint(config, options);
            return (path: string) => lintFuncer(path);
        };
        const lint = await lintFuncWrapper();
        const results: LinterLintFileResult[][] = [];

        for (const filePath of filePaths) {
            const stats = await stat(filePath);
            if (stats.isDirectory()) {
                const result = await this.lintDir(filePath, options, lint);
                results.push(result);
            } else {
                const result = await lint(filePath);
                results.push([result]);
            }
        }
        return results;
    }
}
