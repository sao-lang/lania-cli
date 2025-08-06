import { createLinter, loadTextlintrc } from 'textlint';
import Linter from './linter.base';
import {
    LinterConfiguration,
    LinterHandleDirOptions,
    LinterOutput,
    TextLinterSupportFileType,
} from '@lania-cli/types';
import { getFileExt, getLinterModuleConfig } from '@lania-cli/common';
import { getFileTypes } from './helper';

interface PartialTextlint {
    createLinter: typeof createLinter;
    loadTextlintrc: typeof loadTextlintrc;
}

export class TextLinter extends Linter<
    TextLinterSupportFileType,
    LinterOutput,
    { textlint: PartialTextlint }
> {
    private config: LinterConfiguration;
    protected fileTypes: TextLinterSupportFileType[];
    private innerLinter: ReturnType<typeof createLinter>;
    protected base: { textlint: PartialTextlint } = {
        textlint: {
            createLinter,
            loadTextlintrc,
        },
    };
    constructor(config: LinterConfiguration = 'textlint', options?: LinterHandleDirOptions) {
        super(options, (filePath) => this.getFileTypes().includes(getFileExt(filePath)));
        this.config = config;
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
            lintType: 'textlint',
        } as LinterOutput;
    }
    private getFileTypes() {
        return getFileTypes('textlint') as TextLinterSupportFileType[];
    }

    private async createInnerLinter() {
        if (this.innerLinter) {
            const configObject = await getLinterModuleConfig(this.config);
            this.innerLinter = this.base.textlint.createLinter({
                ignoreFilePath: this.options?.ignorePath,
                descriptor: await this.base.textlint.loadTextlintrc(configObject),
            });
        }
        return this.innerLinter;
    }
}

export default TextLinter;
