import codeFormat, { type CodeType } from '@utils/code';
import to from '@utils/to';
import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { dirname, extname } from 'path';
import ejs from 'ejs';
export const mkDirsSync = (dirPath: string) => {
    try {
        if (existsSync(dirPath)) {
            return true;
        } else {
            if (mkDirsSync(dirname(dirPath))) {
                mkdirSync(dirPath);
                return true;
            }
        }
    } catch (e) {
        throw e as Error;
    }
};
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
        const [formatErr, code] = await to(codeFormat(templateCode, extname(filePath) as CodeType));
        if (formatErr) {
            throw formatErr;
        }
        try {
            mkDirsSync(outputPath);
        } catch (e) {
            throw e as Error;
        }
        const [writeErr] = await to(writeFile(code, outputPath, 'utf-8'));
        if (writeErr) {
            throw writeErr;
        }
    }
}
