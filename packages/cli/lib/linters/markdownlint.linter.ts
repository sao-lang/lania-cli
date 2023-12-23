import to from '@utils/to';
import { LinterConfiguration, getModuleConfig } from './linter.util';
import { readFile, writeFile } from 'fs/promises';
import textlint from 'textlint';

type MarkdownLinterCheckFileResult = {
    filePath: string;
    output: { line: number; rule: string; description: string }[];
};
export default class MarkdownLinter {
    async checkFile(filePath: string, config: LinterConfiguration, fix?: boolean) {
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        // console.log(configObject);
        // textlint.createLinter({})
        if (getConfigErr) {
            throw getConfigErr;
        }
    }
    public async lint(filePath: string) {}
}
