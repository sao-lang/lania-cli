import { ESLint } from 'eslint';
import Linter from './linter.base';
import { readFile, writeFile } from 'fs/promises';
import {
    LinterOutput,
    EsLinterSupportFileType,
    ConfigurationGetType,
    LinterHandleDirOptions,
} from '@lania-cli/types';
import { getEslintConfig } from '@lania-cli/common';
import { getFileTypes } from './helper';

export class EsLinter extends Linter<EsLinterSupportFileType, LinterOutput, typeof ESLint> {
    private config: ConfigurationGetType;
    protected base: typeof ESLint;
    protected fileTypes = getFileTypes('eslint') as EsLinterSupportFileType[];
    private innerLinter: ESLint;
    constructor(config: ConfigurationGetType = 'eslint', options?: LinterHandleDirOptions) {
        super(options);
        this.config = config;
        this.base = options?.outerLinter?.eslint ?? ESLint;
    }
    public async lintFile(path: string) {
        const eslint = await this.createInnerLinter();
        const [{ messages, errorCount, warningCount }] = await eslint.lintFiles(path);
        const output = messages.map(({ message, line, endColumn, endLine, column, severity }) => ({
            description: message,
            line,
            endColumn,
            endLine,
            column,
            type: severity === 1 ? 'warning' : 'error',
        }));
        if (this.options?.fix && errorCount !== 0) {
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
            lintType: 'eslint',
        } as LinterOutput;
    }
    private async createInnerLinter() {
        if (!this.innerLinter) {
            const overrideConfig = await getEslintConfig(this.config);
            this.innerLinter = new this.base({
                overrideConfig,
                fix: this.options?.fix,
            });
        }
        return this.innerLinter;
    }
}

export default EsLinter;
