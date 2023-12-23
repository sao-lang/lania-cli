import stylelint from 'stylelint';
import {
    getModuleConfig,
    traverseFiles,
    type LinterConfiguration,
    getFileExt,
} from './linter.util';
import { stat } from 'fs/promises';
import to from '@utils/to';
type StyleLinterCheckFileResult = {
    filePath: string;
    output: {
        description: string;
        line: number;
        endColumn: number;
        endLine: number;
        column: number;
    }[];
};
type StyleLinterHandleDirOptions = {
    fileTypes?: StyleLinterSupportFileType[];
    ignorePath?: string;
    fix?: boolean;
};
type StyleLinterSupportFileType = 'css' | 'styl' | 'sass' | 'less' | 'vue' | 'svelte' | 'astro';
export default class StyleLinter {
    private lintFileTypes = ['css', 'styl', 'sass', 'less', 'vue', 'svelte', 'astro'];
    private async checkFile(
        filePath: string,
        config: LinterConfiguration,
        ignorePath?: string,
        fix?: boolean,
    ) {
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const [lintErr, lintResult] = await to(
            stylelint.lint({
                files: filePath,
                config: configObject,
                ignorePath,
                fix,
                formatter: 'github',
            }),
        );
        if (lintErr) {
            throw lintErr;
        }
        const {
            results: [result],
        } = lintResult;
        const { warnings } = result;
        return {
            filePath,
            output:
                warnings.length > 0
                    ? warnings.map(({ line, endLine, column, endColumn, text, rule }) => ({
                          line,
                          endLine,
                          endColumn,
                          description: text,
                          column,
                          rule,
                      }))
                    : null,
        } as StyleLinterCheckFileResult;
    }
    private async checkDir(
        path: string,
        config: LinterConfiguration,
        options?: StyleLinterHandleDirOptions,
    ) {
        const { fileTypes, ignorePath, fix } = options || {};
        const results: StyleLinterCheckFileResult[] = [];
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const [traverseFilesErr] = await to(
            traverseFiles(path, async (filePath) => {
                const ext = getFileExt(filePath) as StyleLinterSupportFileType;
                if (
                    (!fileTypes && this.lintFileTypes.includes(ext)) ||
                    (fileTypes && fileTypes.includes(ext))
                ) {
                    const [checkFileErr, result] = await to(
                        this.checkFile(filePath, configObject, ignorePath, fix),
                    );
                    if (checkFileErr) {
                        throw checkFileErr;
                    }
                    results.push(result);
                }
            }),
        );
        if (traverseFilesErr) {
            throw traverseFilesErr;
        }
        return results;
    }

    public async check(
        filePaths: string | string[],
        config: Record<string, any> | string,
        options?: StyleLinterHandleDirOptions,
    ) {
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const results: StyleLinterCheckFileResult[][] = [];
        for (const filePath of filePaths) {
            const [statErr, stats] = await to(stat(filePath));
            if (statErr) {
                throw statErr;
            }
            if (stats.isDirectory()) {
                const [checkDirErr, result] = await to(
                    this.checkDir(filePath, configObject, options),
                );
                if (checkDirErr) {
                    throw checkDirErr;
                }
                results.push(result);
            } else {
                const [checkFileErr, result] = await to(
                    this.checkFile(filePath, configObject, options.ignorePath, options.fix),
                );

                if (checkFileErr) {
                    throw checkFileErr;
                }
                results.push([result]);
            }
        }
        return results;
    }
    public async lint(
        filePaths: string | string[],
        config: LinterConfiguration,
        options?: StyleLinterHandleDirOptions,
    ) {
        const [getConfigErr, configObject] = await to<Record<string, any>>(getModuleConfig(config));
        if (getConfigErr) {
            throw getConfigErr;
        }
        const [checkErr, results] = await to(this.check(filePaths, configObject, options));
        if (checkErr) {
            throw checkErr;
        }
        return results;
    }
}
