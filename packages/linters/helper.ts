import {
    EsLinterSupportFileType,
    PrettierSupportFileType,
    StyleLinterSupportFileType,
    TextLinterSupportFileType,
} from '@lania-cli/types';

export const getFileTypes = (linter: string) => {
    if (linter === 'eslint') {
        return [
            'ts',
            'tsx',
            'js',
            'jsx',
            'vue',
            'astro',
            'svelte',
            'cjs',
            'mjs',
        ] as EsLinterSupportFileType[];
    }
    if (linter === 'prettier') {
        return [
            'js',
            'json',
            'ts',
            'jsx',
            'tsx',
            'vue',
            'svelte',
            'css',
            'html',
            'scss',
            'less',
            'styl',
            'md',
            'yaml',
            'astro',
            'yml',
            'ejs',
        ] as PrettierSupportFileType[];
    }
    if (linter === 'stylelint') {
        return [
            'css',
            'styl',
            'sass',
            'less',
            'vue',
            'svelte',
            'astro',
        ] as StyleLinterSupportFileType[];
    }
    if (linter === 'textlint') {
        return ['txt', 'md'] as TextLinterSupportFileType[];
    }
};
