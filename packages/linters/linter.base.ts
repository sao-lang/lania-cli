import { stat } from 'fs/promises';
import { traverseFiles } from './linter.util';
import { getFileExt, getLanConfig } from '@lania-cli/common';

export default abstract class Linter<
    SupportFileType extends string,
    LintOutput extends Record<string, any>,
    Base extends Record<string, any>,
> {
    constructor() {
        this.setBase();
    }
    protected abstract lintFile(path: string): Promise<LintOutput>;
    protected abstract fileTypes: SupportFileType[];
    protected abstract base: Base;

    private async setBase() {
        const config = await getLanConfig();
        if (config?.dependencies) {
            this.base = config?.dependencies as Base;
        }
    }
    public async lintDir(path: string) {
        const results: LintOutput[] = [];
        await traverseFiles(path, async (filePath) => {
            const ext = getFileExt(filePath);
            if (this.fileTypes.includes(ext as SupportFileType)) {
                results.push(await this.lintFile(path));
            }
        });
        return results;
    }
    public async lint(filePaths: string) {
        const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const results: LintOutput[][] = [];
        for (const path of paths) {
            const stats = await stat(path);
            const isDirectory = stats.isDirectory();
            const result = isDirectory ? await this.lintDir(path) : [await this.lintFile(path)];
            results.push(result);
        }
        return results;
    }
}
