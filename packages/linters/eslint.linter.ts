// import { ESLint,  } from 'eslint';
import Linter from './linter.base';
import { ESLint } from './eslint.types';
import { readFile, writeFile } from 'fs/promises';
import {
    LinterOutput,
    EsLinterSupportFileType,
    LinterConfiguration,
    LinterHandleDirOptions,
} from '@lania-cli/types';
import { getFileExt, getLinterModuleConfig } from '@lania-cli/common';
import { getFileTypes } from './helper';

export class EsLinter extends Linter<
    EsLinterSupportFileType,
    LinterOutput,
    { eslint: { ESLint: ESLint } }
> {
    private config: LinterConfiguration;
    protected base: any = {};
    protected fileTypes: EsLinterSupportFileType[];
    private innerLinter: ESLint;
    constructor(config: LinterConfiguration = 'eslint', eslintAdaptor: ESLint, options?: LinterHandleDirOptions) {
        super(options, (filePath) => this.getFileTypes().includes(getFileExt(filePath)));
        this.config = config;
        this.fileTypes = this.getFileTypes();
        this.base = { eslint: eslintAdaptor }
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
    private getFileTypes() {
        return getFileTypes('eslint') as EsLinterSupportFileType[];
    }
    private async createInnerLinter() {
        if (!this.innerLinter) {
            const configObject = await getLinterModuleConfig(this.config);
            this.innerLinter = new this.base.eslint.ESLint({
                overrideConfig: configObject,
                fix: this.options?.fix,
            });
        }
        return this.innerLinter;
    }
}

export default EsLinter;
