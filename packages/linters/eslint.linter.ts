import { ESLint } from 'eslint';
import Linter from './linter.base';
import { getModuleConfig } from './linter.util';
import { readFile, writeFile } from 'fs/promises';
import {
    EsLinterOutput,
    EsLinterSupportFileType,
    LinterConfiguration,
    LinterHandleDirOptions,
} from '@lania-cli/types';

export class EsLinter extends Linter<EsLinterSupportFileType, EsLinterOutput> {
    private config: LinterConfiguration;
    private options: LinterHandleDirOptions;
    protected fileTypes: EsLinterSupportFileType[];
    private innerLinter: ESLint;
    constructor(config: LinterConfiguration, options?: LinterHandleDirOptions) {
        super();
        this.config = config;
        this.options = options;
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
        if (this.innerLinter) {
            const configObject = await getModuleConfig(this.config);
            this.innerLinter = new ESLint({
                overrideConfig: configObject,
                ignorePath: this.options?.ignorePath,
                fix: this.options?.fix,
            });
        }
        return this.innerLinter;
    }
}

export default EsLinter
