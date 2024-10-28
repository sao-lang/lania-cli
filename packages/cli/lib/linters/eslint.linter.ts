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
        const linter = {
            fileTypes: [
                'ts',
                'tsx',
                'js',
                'jsx',
                'vue',
                'astro',
                'svelte',
                'cjs',
                'mjs',
            ] as EsLinterSupportFileType[],
            lint: async (config: LinterConfiguration) => {
                const configObject = await getModuleConfig(config);
                return async (path: string, options?: LinterHandleDirOptions) => {
                    const eslint = new ESLint({
                        overrideConfig: configObject,
                        ignorePath: options?.ignorePath,
                        fix: options?.fix,
                    });
                    const {
                        0: { messages, errorCount, warningCount },
                    } = await eslint.lintFiles(path);
                    const output = messages.map(
                        ({ message, line, endColumn, endLine, column, severity }) => ({
                            description: message,
                            line,
                            endColumn,
                            endLine,
                            column,
                            type: severity === 0 ? 'error' : 'warning',
                        }),
                    );
                    return {
                        filePath: path,
                        output: output.length === 0 ? null : output,
                        errorCount,
                        warningCount,
                    };
                };
            },
            fix: async (config: LinterConfiguration) => {
                const configObject = await getModuleConfig(config);
                return async (path: string, options?: LinterHandleDirOptions) => {
                    const eslint = new ESLint({
                        overrideConfig: configObject,
                        ignorePath: options?.ignorePath,
                        fix: options?.fix,
                    });
                    const {
                        0: { messages, errorCount, warningCount },
                    } = await eslint.lintFiles(path);
                    const output = messages.map(
                        ({ message, line, endColumn, endLine, column, severity }) => ({
                            description: message,
                            line,
                            endColumn,
                            endLine,
                            column,
                            type: severity === 0 ? 'error' : 'warning',
                        }),
                    );
                    if (output && errorCount !== 0) {
                        const content = await readFile(path, 'utf-8');
                        const {
                            0: { output },
                        } = await eslint.lintText(content);
                        output && (await writeFile(path, output, 'utf-8'));
                    }
                    return {
                        filePath: path,
                        output: output.length === 0 ? null : output,
                        errorCount,
                        warningCount,
                    };
                };
            },
        };
        super(linter);
    }
}
