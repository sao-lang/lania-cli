import to from '@utils/to';
import { readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import ejs from 'ejs';
import PrettierLinter, { type PrettierSupportFileType } from '@linters/prettier.linter';
import { mkDirs } from './compiler.util';
import { getFileExt } from '@linters/linter.util';

export default class EjsCompiler {
    public async compile(
        content: string,
        outputPath: string,
        options: Record<string, string | number | boolean>,
    ) {
        // const content = await readFile(filePath, 'utf-8');
        const templateCode = ejs.render(content, options);
        const fileTypes = PrettierLinter.listFileTypes();
        const ext = getFileExt<PrettierSupportFileType>(outputPath);
        if (!fileTypes.includes(ext)) {
            await mkDirs(dirname(outputPath));
            await writeFile(templateCode, outputPath, 'utf-8');
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
