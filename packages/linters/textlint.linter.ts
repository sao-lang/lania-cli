import { createLinter, loadTextlintrc } from 'textlint';
import Linter from './linter.base';
import {
    ConfigurationGetType,
    LinterHandleDirOptions,
    LinterOutput,
    TextLinterSupportFileType,
} from '@lania-cli/types';

interface PartialTextlint {
    createLinter: typeof createLinter;
    loadTextlintrc: typeof loadTextlintrc;
}

export class TextLinter extends Linter<TextLinterSupportFileType, LinterOutput, PartialTextlint> {
    private configType: ConfigurationGetType;
    private innerLinter: ReturnType<typeof createLinter>;
    constructor(configType: ConfigurationGetType = 'textlint', options?: LinterHandleDirOptions) {
        super(
            options,
            'textlint',
            options?.outerLinter?.textlint ?? {
                createLinter,
                loadTextlintrc,
            },
        );
        this.configType = configType;
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
            const configObject = await this.getBaseConfig(this.configType);
            this.innerLinter = this.base.createLinter({
                ignoreFilePath: this.options?.ignorePath,
                descriptor: await this.base.loadTextlintrc(configObject),
            });
        }
        return this.innerLinter;
    }
}

export default TextLinter;
