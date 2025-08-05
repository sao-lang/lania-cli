import stylelint from 'stylelint';
import Linter from './linter.base';
import {
    LinterConfiguration,
    LinterHandleDirOptions,
    StyleLinterOutput,
    StyleLinterSupportFileType,
} from '@lania-cli/types';
import { getLinterModuleConfig } from '@lania-cli/common';

export class StyleLinter extends Linter<
    StyleLinterSupportFileType,
    StyleLinterOutput,
    { stylelint: typeof stylelint }
> {
    private config: LinterConfiguration;
    protected fileTypes: StyleLinterSupportFileType[];
    protected base = { stylelint };
    constructor(config: LinterConfiguration = 'stylelint', options?: LinterHandleDirOptions) {
        super(options);
        this.config = config;
        this.fileTypes = this.getFileTypes();
    }
    public async lintFile(path: string) {
        const config = await getLinterModuleConfig(this.config);
        const { results } = await this.base.stylelint.lint({ files: path, config, ...(this.options || {}) });
        const { warnings, parseErrors } = results[0];
        return {
            filePath: path,
            output: this.createOutput(results[0]),
            warningCount: warnings.length,
            errorCount: parseErrors.length,
        } as StyleLinterOutput;
    }
    private getFileTypes() {
        const fileTypes = ['css', 'styl', 'sass', 'less', 'vue', 'svelte', 'astro'];
        return fileTypes as StyleLinterSupportFileType[];
    }
    private createOutput(result: stylelint.LintResult) {
        const { warnings, parseErrors } = result;
        const errorCount = parseErrors.length;
        const warningCount = warnings.length;
        const mapErrors = (isWarning = false) => {
            return ({ line, endLine, column, endColumn, text }: any) => ({
                line,
                endLine,
                endColumn,
                description: text,
                column,
                type: isWarning ? 'warning' : 'error',
            });
        };
        return warningCount === 0 && errorCount === 0
            ? null
            : [...warnings.map(mapErrors(true)), ...parseErrors.map(mapErrors())];
    }
}

export default StyleLinter;
