export type ConfigurationLoadType =
    | 'npm'
    | 'pnpm'
    | 'yarn'
    | 'prettier'
    | 'package'
    | 'eslint'
    | 'stylelint'
    | 'commitlint'
    | 'markdownlint'
    | 'tsc'
    | 'editorconfig'
    | 'webpack'
    | 'vite'
    | 'gulp'
    | 'rollup';

export type ModuleName = ConfigurationLoadType | { module: string; searchPlaces?: string[] };
