import { writeFile } from 'fs/promises';
import { dirname } from 'path';
import ejs from 'ejs';
import PrettierLinter from '../linters/prettier.linter';
import { mkDirs } from '../../utils/dir';
import { getFileExt } from '../../utils/file';
import { PrettierSupportFileType } from '@lania-cli/types';

export default class EjsEngine {
    public async render(
        content: string,
        outputPath: string,
        options: Record<string, string | number | boolean>,
    ) {
        const templateCode = ejs.render(content, options) as string;
        const fileTypes = PrettierLinter.listFileTypes();
        const ext = getFileExt<PrettierSupportFileType>(outputPath);
        if (!fileTypes.includes(ext)) {
            await mkDirs(dirname(outputPath));
            await writeFile(outputPath, templateCode, 'utf-8');
            return;
        }
        const code = await PrettierLinter.formatContent(
            templateCode,
            {
                semi: true,
                printWidth: 200,
                tabWidth: 4,
                singleQuote: true,
                trailingComma: 'all',
                useTabs: false,
                jsxSingleQuote: false,
            },
            ext,
        );
        await mkDirs(dirname(outputPath));
        await writeFile(outputPath, code, 'utf-8');
    }
}
