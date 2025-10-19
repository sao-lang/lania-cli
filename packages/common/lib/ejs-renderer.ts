import { writeFile, readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import ejs from 'ejs';
import { mkDirs, getFileExt } from '../utils/fs';
import { PrettierSupportFileType } from '@lania-cli/types';

export class EjsRenderer {
    private format: (code: string, fileType: string) => string | Promise<string>;

    constructor(format?: (code: string, fileType: string) => string | Promise<string>) {
        this.format = format ?? ((code) => code); // 默认不格式化
    }

    private async _processOutput(
        code: string,
        options: { outputPath?: string; fileType?: string },
    ): Promise<string> {
        const ext =
            options.fileType ??
            (options.outputPath ? getFileExt<PrettierSupportFileType>(options.outputPath) : '');

        const formattedCode = (await this.format(code, ext)) ?? code;

        if (options.outputPath) {
            await mkDirs(dirname(options.outputPath));
            await writeFile(options.outputPath, formattedCode, 'utf-8');
        }
        return formattedCode;
    }

    async renderFromString(
        template: string,
        data: Record<string, any>,
        outputPath?: string,
        fileType?: string,
    ): Promise<string> {
        const transformedCode = await ejs.render(template, data, { async: true });
        return this._processOutput(transformedCode, { outputPath, fileType });
    }

    async renderFromFile(
        filePath: string,
        data: Record<string, any>,
        outputPath?: string,
        fileType?: string,
    ): Promise<string> {
        const absPath = resolve(filePath);
        const template = await readFile(absPath, 'utf-8');
        const transformedCode = await ejs.render(template, data, { async: true });
        return this._processOutput(transformedCode, { outputPath, fileType });
    }
}
