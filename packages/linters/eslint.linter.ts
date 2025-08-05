import { ESLint } from 'eslint';
import Linter from './linter.base';
import { readFile, writeFile } from 'fs/promises';
import {
    EsLinterOutput,
    EsLinterSupportFileType,
    LinterConfiguration,
    LinterHandleDirOptions,
} from '@lania-cli/types';
import { getLinterModuleConfig } from '@lania-cli/common';

export class EsLinter extends Linter<
    EsLinterSupportFileType,
    EsLinterOutput,
    { eslint: { ESLint: typeof ESLint } }
> {
    private config: LinterConfiguration;
    protected base = { eslint: { ESLint } };
    protected fileTypes: EsLinterSupportFileType[];
    private innerLinter: ESLint;
    constructor(config: LinterConfiguration = 'eslint', options?: LinterHandleDirOptions) {
        super(options);
        this.config = config;
        this.fileTypes = this.getFileTypes();
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
        } as EsLinterOutput;
    }
    private getFileTypes() {
        const fileTypes = ['ts', 'tsx', 'js', 'jsx', 'vue', 'astro', 'svelte', 'cjs', 'mjs'];
        return fileTypes as EsLinterSupportFileType[];
    }
    private async createInnerLinter() {
        if (!this.innerLinter) {
            const configObject = await getLinterModuleConfig(this.config);
            this.innerLinter = new this.base.eslint.ESLint({
                overrideConfig: configObject,
                ignorePath: this.options?.ignorePath,
                fix: this.options?.fix,
            });
        }
        return this.innerLinter;
    }
}

export default EsLinter;
