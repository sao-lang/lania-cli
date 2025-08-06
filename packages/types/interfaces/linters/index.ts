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

export interface LinterOutput {
    filePath: string;
    output:
        | {
              description: string;
              line?: number;
              endColumn?: number;
              endLine?: number;
              column?: number;
              type: 'error' | 'warning';
          }[]
        | null;
    errorCount: number;
    warningCount: number;
    lintType: string;
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
    lintType: string;
}

export type StyleLinterSupportFileType =
    | 'css'
    | 'styl'
    | 'sass'
    | 'less'
    | 'vue'
    | 'svelte'
    | 'astro';
export type TextLinterSupportFileType = 'txt' | 'md';
