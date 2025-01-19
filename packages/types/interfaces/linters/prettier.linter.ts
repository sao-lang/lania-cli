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
