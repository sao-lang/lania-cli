import { createLinter, loadTextlintrc } from 'textlint';
import { getModuleConfig, type LinterConfiguration } from './linter.util';
import Linter, { LinterHandleDirOptions } from './linter.base';

type TextLinterSupportFileType = 'txt' | 'md';

export default class EsLinter extends Linter {
    constructor() {
        const linter = {
            fileTypes: ['txt', 'md'] as TextLinterSupportFileType[],
            lint: async (config: LinterConfiguration) => {
                const configObject = await getModuleConfig(config);
                return async (path: string, options?: LinterHandleDirOptions) => {
                    const instance = createLinter({
                        ignoreFilePath: options.ignorePath,
                        descriptor: await loadTextlintrc(configObject),
                    });
                    const {
                        0: { messages },
                    } = await instance.lintFiles([path]);
                    const output = messages
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
                        filePath: path,
                        output: output.length === 0 ? null : output,
                        errorCount: output.filter(({ type }) => type === 'error').length,
                        warningCount: output.filter(({ type }) => type === 'warning').length,
                    };
                };
            },
            fix: async (config: LinterConfiguration) => {
                const configObject = await getModuleConfig(config);
                return async (path: string, options?: LinterHandleDirOptions) => {
                    const instance = createLinter({
                        ignoreFilePath: options.ignorePath,
                        descriptor: await loadTextlintrc(configObject),
                    });
                    const {
                        0: { messages },
                    } = await instance.fixFiles([path]);
                    const output = messages
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
                        filePath: path,
                        output: output.length === 0 ? null : output,
                        errorCount: output.filter(({ type }) => type === 'error').length,
                        warningCount: output.filter(({ type }) => type === 'warning').length,
                    };
                };
            },
        };
        super(linter);
    }
}
