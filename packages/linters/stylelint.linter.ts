import stylelint from 'stylelint';
import Linter from './linter.base';
import {
    ConfigurationGetType,
    LinterHandleDirOptions,
    LinterOutput,
    StyleLinterSupportFileType,
} from '@lania-cli/types';
import { createRequire } from 'module';

export class StyleLinter extends Linter<
    StyleLinterSupportFileType,
    LinterOutput,
    typeof stylelint
> {
    private configType: ConfigurationGetType;
    constructor(configType: ConfigurationGetType = 'stylelint', options?: LinterHandleDirOptions) {
        super(options, 'stylelint', options?.outerLinter?.stylelint ?? stylelint);
        this.configType = configType;
    }
    public async runStylelint(projectRoot, fix = false) {
        const requireFromProject = createRequire(projectRoot + '/index.js');
        const config = {
            extends: ['stylelint-config-standard-scss', 'stylelint-prettier/recommended'],
            plugins: ['stylelint-prettier'],
            overrides: [
                {
                    files: ['**/*.vue'],
                    customSyntax: requireFromProject.resolve('postcss-html'),
                },
            ],
        };
        return await stylelint.lint({
            config,
            fix,
            cwd: projectRoot,
            files: ['**/*.{vue,css,scss,sass,less}'],
        });
    }

    public async lintFile(path: string) {
        const config = await this.getBaseConfig(this.configType);
        const cwd = process.cwd();
        const { results } = await this.base.lint({
            files: path,
            config,
            fix: this.options?.fix,
            cwd,
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
