import stylelint from 'stylelint';
import Linter from './linter.base';
import {
    LinterConfiguration,
    LinterHandleDirOptions,
    LinterOutput,
    StyleLinterSupportFileType,
} from '@lania-cli/types';
import { getFileExt, getLinterModuleConfig } from '@lania-cli/common';
import { getFileTypes } from './helper';

export class StyleLinter extends Linter<
    StyleLinterSupportFileType,
    LinterOutput,
    { stylelint: typeof stylelint }
> {
    private config: LinterConfiguration;
    protected fileTypes: StyleLinterSupportFileType[];
    protected base = { stylelint };
    constructor(config: LinterConfiguration = 'stylelint', options?: LinterHandleDirOptions) {
        super(options, (filePath) => this.getFileTypes().includes(getFileExt(filePath)));
        this.config = config;
        this.fileTypes = this.getFileTypes();
    }
    public async lintFile(path: string) {
        const config = await getLinterModuleConfig(this.config);
        const { results } = await this.base.stylelint.lint({
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
    private getFileTypes() {
        return getFileTypes('stylelint') as StyleLinterSupportFileType[];
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
