import stylelint from 'stylelint';
import Linter from './linter.base';
import {
    ConfigurationGetType,
    LinterHandleDirOptions,
    LinterOutput,
    StyleLinterSupportFileType,
} from '@lania-cli/types';
import { getStylelintConfig } from '@lania-cli/common';
import { getFileTypes } from './helper';

export class StyleLinter extends Linter<
    StyleLinterSupportFileType,
    LinterOutput,
    typeof stylelint
> {
    private config: ConfigurationGetType;
    protected fileTypes = getFileTypes('stylelint') as StyleLinterSupportFileType[];
    protected base: typeof stylelint;
    constructor(config: ConfigurationGetType = 'stylelint', options?: LinterHandleDirOptions) {
        super(options);
        this.config = config;
        this.base = options?.outerLinter ?? stylelint;
    }
    public async lintFile(path: string) {
        const config = await getStylelintConfig(this.config);
        const { results } = await this.base.lint({
            files: path,
            config,
            fix: this.options?.fix,
        });
        const { warnings, parseErrors } = results[0];
        return {
            filePath: path,
            output: this.createOutput(results[0]),
            warningCount: warnings.length,
            errorCount: parseErrors.length,
            lintType: 'stylelint',
        } as LinterOutput;
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
