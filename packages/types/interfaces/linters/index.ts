import { ConfigurationLoadType } from '../shared';
export interface LinterHandleDirOptions {
    fix?: boolean;
    ignorePath?: string;
}

export type LinterConfiguration = ConfigurationLoadType | Record<string, any>;

export type EsLinterSupportFileType =
    | 'ts'
    | 'tsx'
    | 'js'
    | 'jsx'
    | 'vue'
    | 'astro'
    | 'svelte'
    | 'cjs'
    | 'mjs';

export interface EsLinterOutput {
    filePath: string;
    output: {
        description: string;
        line: number;
        endColumn: number;
        endLine: number;
        column: number;
        type: 'error' | 'warning';
    }[];
    errorCount: number;
    warningCount: number;
}
export type PrettierSupportFileType =
    | 'js'
    | 'json'
    | 'ts'
    | 'jsx'
    | 'tsx'
    | 'vue'
    | 'svelte'
    | 'css'
    | 'html'
    | 'scss'
    | 'less'
    | 'styl'
    | 'md'
    | 'yaml'
    | 'astro'
    | 'yml'
    | 'ejs';

export interface PrettierOutput {
    filePath: string;
    isFormatted?: boolean;
}

export type StyleLinterSupportFileType =
    | 'css'
    | 'styl'
    | 'sass'
    | 'less'
    | 'vue'
    | 'svelte'
    | 'astro';
export interface StyleLinterOutput extends EsLinterOutput {}

export type TextLinterSupportFileType = 'txt' | 'md';

export interface TextLinterOutput extends EsLinterOutput {}
