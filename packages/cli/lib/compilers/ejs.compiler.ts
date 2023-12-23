import to from '@utils/to';
import { readFile, writeFile } from 'fs/promises';
import { dirname, extname } from 'path';
import ejs from 'ejs';
import PrettierLinter, { PrettierSupportFileType } from '@linters/prettier.linter';
import { mkDirs } from './compiler.util';

export default class EjsCompiler {
    public async compile(
        filePath: string,
        outputPath: string,
        options: Record<string, string | number | boolean>,
    ) {
        const [readErr, content] = await to(readFile(filePath, 'utf-8'));
        if (readErr) {
            throw readErr;
        }
        const templateCode = ejs.render(content, options);
        const [formatErr, code] = await to(
            PrettierLinter.formatContent(
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
                extname(filePath) as PrettierSupportFileType,
            ),
        );
        if (formatErr) {
            throw formatErr;
        }
        const [makeDirsErr] = await to(mkDirs(dirname(outputPath)));
        if (makeDirsErr) {
            throw makeDirsErr;
        }
        const [writeErr] = await to(writeFile(code, outputPath, 'utf-8'));
        if (writeErr) {
            throw writeErr;
        }
    }
}
