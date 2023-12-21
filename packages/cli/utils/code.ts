import prettier from 'prettier';
import stylusSupremacy from 'stylus-supremacy';
export type CodeType =
    | 'js'
    | 'json'
    | 'ts'
    | 'jsx'
    | 'tsx'
    | 'vue'
    | 'svelte'
    | 'css'
    | 'html'
    | 'sass'
    | 'less'
    | 'stylus'
    | 'markdown'
    | 'angular'
    | 'yaml'
    | 'astro'
    | 'ignore'
    | 'other';

const getParser = (type: CodeType) => {
    switch (type) {
        case 'js':
        case 'jsx':
            return 'babel';
        case 'json':
            return 'json';
        case 'ts':
        case 'tsx':
            return 'babel-ts';
        case 'css':
            return 'css';
        case 'svelte':
        case 'astro':
        case 'html':
            return 'html';
        case 'vue':
            return 'vue';
        case 'sass':
            return 'scss';
        case 'less':
            return 'less';
        case 'markdown':
            return 'markdown';
        case 'angular':
            return 'angular';
        case 'yaml':
            return 'yaml';
        default:
            return 'babel';
    }
};

/**格式化代码字符串*/
export const codeFormat = (code: string, type: CodeType = 'json') => {
    return new Promise((resolve: (value: string) => void, reject) => {
        try {
            if (type === 'other') {
                return resolve(code);
            }
            if (type === 'ignore') {
                return resolve(code.replace(/ +/g, ''));
            }
            if (type === 'stylus') {
                const formateCode = stylusSupremacy.format(code as string, {
                    // eslint-disable-next-line quotes
                    quoteChar: "'",
                    tabStopChar: '    ',
                    insertColons: false,
                    insertSemicolons: false,
                    insertBraces: false,
                });
                return resolve(formateCode);
            }
        } catch (error: any) {
            reject(error);
        }
        const parser = getParser(type);
        return prettier
            .format(code, {
                semi: true,
                printWidth: 200,
                tabWidth: 4,
                singleQuote: true,
                parser,
                trailingComma: 'all',
                useTabs: false,
                jsxSingleQuote: false,
            })
            .then((res) => {
                resolve(res);
            })
            .catch((e: any) => {
                reject(e);
            });
    });
};

export default codeFormat;
