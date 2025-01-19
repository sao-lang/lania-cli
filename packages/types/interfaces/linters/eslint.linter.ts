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
