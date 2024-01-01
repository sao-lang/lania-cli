import stylelint from 'stylelint';
import { getModuleConfig, type LinterConfiguration } from './linter.util';
import Linter, { LinterHandleDirOptions } from './linter.base';
type StyleLinterSupportFileType = 'css' | 'styl' | 'sass' | 'less' | 'vue' | 'svelte' | 'astro';

export default class StyleLinter extends Linter {
    constructor() {
        const lint = async (config: LinterConfiguration) => {
            const configObject = await getModuleConfig(config);
            return async (path: string, options?: LinterHandleDirOptions) => {
                const {
                    results: [result],
                } = await stylelint.lint({
                    files: path,
                    config: configObject,
                    ...(options || {}),
                });
                const { warnings, parseErrors } = result;
                const errorCount = parseErrors.length;
                const warningCount = warnings.length;
                return {
                    filePath: path,
                    output:
                        warningCount === 0 && errorCount === 0
                            ? null
                            : [
                                  ...warnings.map(({ line, endLine, column, endColumn, text }) => ({
                                      line,
                                      endLine,
                                      endColumn,
                                      description: text,
                                      column,
                                      type: 'warning',
                                  })),
                                  ...parseErrors.map(
                                      ({ line, endLine, column, endColumn, text }) => ({
                                          line,
                                          endLine,
                                          endColumn,
                                          description: text,
                                          column,
                                          type: 'error',
                                      }),
                                  ),
                              ],
                    warningCount,
                    errorCount,
                };
            };
        };
        const linter = {
            fileTypes: [
                'css',
                'styl',
                'sass',
                'less',
                'vue',
                'svelte',
                'astro',
            ] as StyleLinterSupportFileType[],
            lint,
            fix: lint,
        };
        super(linter);
    }
}
