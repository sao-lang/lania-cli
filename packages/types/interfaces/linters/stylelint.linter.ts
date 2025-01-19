import { EsLinterOutput } from './eslint.linter';

export type StyleLinterSupportFileType =
    | 'css'
    | 'styl'
    | 'sass'
    | 'less'
    | 'vue'
    | 'svelte'
    | 'astro';
export interface StyleLinterOutput extends EsLinterOutput {}
