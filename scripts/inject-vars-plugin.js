import { readFileSync } from 'fs';
import { resolve } from 'path';
import { __dirname } from './utils.js';
export default function injectVarsPlugin() {
    const simpleHash = (key) => {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = (hash << 5) - hash + key.charCodeAt(i);
            hash |= 0;
        }
        let hashStr = hash.toString(16);
        return hashStr.replace(/[^a-zA-Z0-9_$]/g, '_');
    };
    const createVarName = (key) => {
        return `${key}__injected_${simpleHash(key)}`;
    };
    return {
        name: 'inject-vars-plugin',
        transform(code) {
            const injection = [
                {
                    key: '__dirname',
                    createNewInjection: () => {
                        return '(() => { const path = new URL(import.meta.url).pathname;return path.substring(0, path.lastIndexOf(\'/\')); })();\n';
                    },
                },
                {
                    key: '__filename',
                    createNewInjection: () => {
                        return '(() => new URL(import.meta.url).pathname)();';
                    },
                },
                {
                    key: '__version',
                    createNewInjection: () => {
                        const packageJsonContent = JSON.parse(
                            readFileSync(
                                resolve(__dirname, '../packages/core/package.json'),
                                'utf-8',
                            ),
                        );
                        return JSON.stringify(packageJsonContent.version);
                    },
                },
                {
                    key: '__cwd',
                    createNewInjection: () => {
                        return process.cwd();
                    },
                },
            ].reduce((oldInjection, { key, createNewInjection }) => {
                if (!code.includes(key)) {
                    return oldInjection;
                }
                const varName = createVarName(key);
                code = code.replace(new RegExp(key, 'g'), varName);
                const newInjection = createNewInjection();
                const newCode = `const ${varName} = ${newInjection};\n`;
                return newCode;
            }, '');
            return {
                code: injection + code,
            };
        },
    };
}
