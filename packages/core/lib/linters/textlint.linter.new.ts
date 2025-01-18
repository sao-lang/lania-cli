import { createLinter, loadTextlintrc } from 'textlint';
import type { EsLinterOutput } from './eslint.linter.new';
import Linter, { LinterHandleDirOptions } from './linter.base.new';
import { LinterConfiguration, getModuleConfig } from './linter.util';

type TextLinterSupportFileType = 'txt' | 'md';

export interface TextLinterOutput extends EsLinterOutput {}

export default class TextLinter extends Linter<TextLinterSupportFileType, TextLinterOutput> {
    private config: LinterConfiguration;
    private options: LinterHandleDirOptions;
    protected fileTypes: TextLinterSupportFileType[];
    private innerLinter: ReturnType<typeof createLinter>;
    constructor(config: LinterConfiguration, options?: LinterHandleDirOptions) {
        super();
        this.config = config;
        this.options = options;
        this.fileTypes = this.getFileTypes();
    }
    public async lintFile(path: string) {
        const instance = await this.createInnerLinter();
        const [{ messages }] = await (this.options?.fix
            ? instance.fixFiles([path])
            : instance.lintFiles([path]));
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
        } as TextLinterOutput;
    }
    private getFileTypes() {
        return ['txt', 'md'] as TextLinterSupportFileType[];
    }

    private async createInnerLinter() {
        if (this.innerLinter) {
            const configObject = await getModuleConfig(this.config);
            this.innerLinter = createLinter({
                ignoreFilePath: this.options?.ignorePath,
                descriptor: await loadTextlintrc(configObject),
            });
        }
        return this.innerLinter;
    }
}
