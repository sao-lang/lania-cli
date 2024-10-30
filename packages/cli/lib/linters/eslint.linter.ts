import { ESLint } from 'eslint';
import { type LinterConfiguration, getModuleConfig } from './linter.util';
import { readFile, writeFile } from 'fs/promises';
import Linter, { LinterHandleDirOptions } from './linter.base';
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

export default class EsLinter extends Linter {
    constructor() {
        const getLintFileTypes = () => {
            const fileTypes = ['ts', 'tsx', 'js', 'jsx', 'vue', 'astro', 'svelte', 'cjs', 'mjs'];
            return fileTypes as EsLinterSupportFileType[];
        };
        const linter = {
            fileTypes: getLintFileTypes(),
            lint: (config: LinterConfiguration) => this.createLintFn(config, false),
            fix: (config: LinterConfiguration) => this.createLintFn(config, true),
        };
        super(linter);
    }

    private async createLintFn(config: LinterConfiguration, isFixMode: boolean) {
        return async (path: string, options?: LinterHandleDirOptions) => {
            const configObject = await getModuleConfig(config);
            const eslint = new ESLint({
                overrideConfig: configObject,
                ignorePath: options?.ignorePath,
                fix: isFixMode || options?.fix,
            });
            const [{ messages, errorCount, warningCount }] = await eslint.lintFiles(path);

            const output = messages.map(
                ({ message, line, endColumn, endLine, column, severity }) => ({
                    description: message,
                    line,
                    endColumn,
                    endLine,
                    column,
                    type: severity === 1 ? 'warning' : 'error',
                }),
            );

            if (isFixMode && errorCount !== 0) {
                const content = await readFile(path, 'utf-8');
                const [{ output: fixedContent }] = await eslint.lintText(content);
                if (fixedContent) {
                    await writeFile(path, fixedContent, 'utf-8');
                }
            }

            return {
                filePath: path,
                output: output.length ? output : null,
                errorCount,
                warningCount,
            };
        };
    }
}
