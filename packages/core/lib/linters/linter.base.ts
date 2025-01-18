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
    | { filePath: string }
    | { filePath: string; isFormatted: boolean };
export interface LinterHandleDirOptions {
    fix?: boolean;
    ignorePath?: string;
    fileTypes?: string[];
}
export interface BaseLinterInterface {
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
    constructor(private linter: BaseLinterInterface) {}
    private async lintDir(
        path: string,
        options: LinterHandleDirOptions,
        lint: (path: string) => Promise<LinterLintFileResult>,
    ) {
        const { fileTypes } = options || {};
        const results: LinterLintFileResult[] = [];
        await traverseFiles(path, async (filePath) => {
            const ext = getFileExt(filePath);
            if (fileTypes?.includes(ext) || this.linter.fileTypes.includes(ext)) {
                results.push(await lint(path));
            }
        });
        return results;
    }
    private async getLintFunction(config: LinterConfiguration, options: LinterHandleDirOptions) {
        return options?.fix
            ? await this.linter.fix(config, options)
            : await this.linter.lint(config, options);
    }
    public async lint(
        filePaths: string[] | string,
        config: LinterConfiguration,
        options: LinterHandleDirOptions,
    ) {
        const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const lintFile = await this.getLintFunction(config, options);
        const results: LinterLintFileResult[][] = [];
        for (const path of paths) {
            const stats = await stat(path);
            const isDirectory = stats.isDirectory();
            const result = isDirectory
                ? await this.lintDir(path, options, lintFile)
                : [await lintFile(path)];
            results.push(result);
        }
        return results;
    }
}
