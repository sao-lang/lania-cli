import { createLinter, loadTextlintrc } from 'textlint';
import Linter from './linter.base';
import {
    ConfigurationGetType,
    LinterHandleDirOptions,
    LinterOutput,
    TextLinterSupportFileType,
} from '@lania-cli/types';
import { getTextlintConfig } from '@lania-cli/common';
import { getFileTypes } from './helper';

interface PartialTextlint {
    createLinter: typeof createLinter;
    loadTextlintrc: typeof loadTextlintrc;
}

export class TextLinter extends Linter<TextLinterSupportFileType, LinterOutput, PartialTextlint> {
    private config: ConfigurationGetType;
    protected fileTypes = getFileTypes('textlint') as TextLinterSupportFileType[];
    private innerLinter: ReturnType<typeof createLinter>;
    protected base: PartialTextlint;
    constructor(config: ConfigurationGetType = 'textlint', options?: LinterHandleDirOptions) {
        super(options);
        this.config = config;
        this.base = options?.outerLinter ?? {
            createLinter,
            loadTextlintrc,
        };
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
    private async createInnerLinter() {
        if (this.innerLinter) {
            const configObject = await getTextlintConfig(this.config);
            this.innerLinter = this.base.createLinter({
                ignoreFilePath: this.options?.ignorePath,
                descriptor: await this.base.loadTextlintrc(configObject),
            });
        }
        return this.innerLinter;
    }
}

export default TextLinter;
