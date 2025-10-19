type LiteralUnion<T extends U, U = string> = T | (Pick<U, never> & { _?: never | undefined });
type BuiltInParserName =
    | 'acorn'
    | 'angular'
    | 'babel-flow'
    | 'babel-ts'
    | 'babel'
    | 'css'
    | 'espree'
    | 'flow'
    | 'glimmer'
    | 'graphql'
    | 'html'
    | 'json-stringify'
    | 'json'
    | 'json5'
    | 'less'
    | 'lwc'
    | 'markdown'
    | 'mdx'
    | 'meriyah'
    | 'scss'
    | 'typescript'
    | 'vue'
    | 'yaml';
type AST = any;
type CustomParser = (text: string, options: Options) => AST | Promise<AST>;
interface SupportLanguage {
    name: string;
    since?: string | undefined;
    parsers: BuiltInParserName[] | string[];
    group?: string | undefined;
    tmScope?: string | undefined;
    aceMode?: string | undefined;
    codemirrorMode?: string | undefined;
    codemirrorMimeType?: string | undefined;
    aliases?: string[] | undefined;
    extensions?: string[] | undefined;
    filenames?: string[] | undefined;
    linguistLanguageId?: number | undefined;
    vscodeLanguageIds?: string[] | undefined;
    interpreters?: string[] | undefined;
    printWidth: number;
    tabWidth: number;
    useTabs?: boolean;
    parentParser?: string | undefined;
    __embeddedInHtml?: boolean | undefined;
}
interface ParserOptions<T = any> extends RequiredOptions {
    locStart: (node: T) => number;
    locEnd: (node: T) => number;
    originalText: string;
}
interface Parser<T = any> {
    parse: (text: string, options: ParserOptions<T>) => T | Promise<T>;
    astFormat: string;
    hasPragma?: ((text: string) => boolean) | undefined;
    locStart: (node: T) => number;
    locEnd: (node: T) => number;
    preprocess?: ((text: string, options: ParserOptions<T>) => string) | undefined;
}
interface Plugin<T = any> {
    languages?: SupportLanguage[] | undefined;
    parsers?: { [parserName: string]: Parser<T> } | undefined;
    defaultOptions?: Partial<RequiredOptions> | undefined;
}
interface RequiredOptions {
    semi: boolean;
    singleQuote: boolean;
    jsxSingleQuote: boolean;
    trailingComma: 'none' | 'es5' | 'all';
    bracketSpacing: boolean;
    bracketSameLine: boolean;
    jsxBracketSameLine: boolean;
    rangeStart: number;
    rangeEnd: number;
    parser: LiteralUnion<BuiltInParserName> | CustomParser;
    filepath: string;
    requirePragma: boolean;
    insertPragma: boolean;
    proseWrap: 'always' | 'never' | 'preserve';
    arrowParens: 'avoid' | 'always';
    plugins: Array<string | Plugin>;
    htmlWhitespaceSensitivity: 'css' | 'strict' | 'ignore';
    endOfLine: 'auto' | 'lf' | 'crlf' | 'cr';
    quoteProps: 'as-needed' | 'consistent' | 'preserve';
    vueIndentScriptAndStyle: boolean;
    embeddedLanguageFormatting: 'auto' | 'off';
    singleAttributePerLine: boolean;
}
interface Options extends RequiredOptions {}

export interface Prettier {
    check(source: string, options?: Options): Promise<boolean>;
    format(source: string, options?: Options): Promise<string>;
}
