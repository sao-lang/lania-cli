import { readFileSync } from 'fs';
import { resolve } from 'path';
import { __dirname } from './utils.js';
export default function injectVarsPlugin() {
    return {
        name: 'replace-filename-dirname',
        transform(code) {
            const injection = [
                {
                    key: '__dirname__',
                    createNewInjection: () => {
                        const dirName = '(() => { const path = new URL(import.meta.url).pathname;return path.substring(0, path.lastIndexOf(\'/\')); })();\n';
                        return `const __dirname__ = ${dirName};\n`;
                    },
                },
                {
                    key: '__filename__',
                    createNewInjection: () => {
                        const fileName = '(() => new URL(import.meta.url).pathname)();\n';
                        return `const __filename__ = ${fileName};\n`;
                    },
                },
                {
                    key: '__version__',
                    createNewInjection: () => {
                        const packageJsonContent = JSON.parse(
                            readFileSync(
                                resolve(__dirname, '../packages/core/package.json'),
                                'utf-8',
                            ),
                        );

                        return `const __version__ = ${JSON.stringify(packageJsonContent.version)};\n`;
                    },
                },
                {
                    key: '__cwd__',
                    createNewInjection: () => {
                        return 'const __cwd__ = process.cwd();\n';
                    },
                },
            ].reduce(
                (oldInjection, { key, createNewInjection }) =>
                    code.includes(key) ? oldInjection + createNewInjection() : oldInjection,
                '',
            );
            return {
                code: injection + code,
            };
        },
    };
}
