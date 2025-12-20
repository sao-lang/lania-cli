import { BuildToolEnum, InteractionConfig, LangEnum, LintToolEnum } from '@lania-cli/types';

export default [
    (options: InteractionConfig) => ({
        outputPath: '/vite.config.ts',
        hide: options.buildTool !== BuildToolEnum.vite || options.language !== LangEnum.TypeScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/vite.config.js',
        hide: options.buildTool !== BuildToolEnum.vite || options.language !== LangEnum.JavaScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/tsconfig.json',
        hide: options.language !== LangEnum.TypeScript,
    }),
    () => ({ outputPath: '/package.json' }),
    (options: InteractionConfig) => ({
        outputPath: '/src/index.ts',
        hide: options.language !== LangEnum.TypeScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/index.js',
        hide: options.language !== LangEnum.JavaScript,
    }),
    () => ({
        outputPath: '/lan.config.js',
    }),
    () => ({
        outputPath: '/.gitignore',
    }),
    (options: InteractionConfig) => ({
        outputPath: '/eslint.config.js',
        hide: !options.lintTools.includes(LintToolEnum.eslint),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/prettier.config.cjs',
        hide: !options.lintTools.includes(LintToolEnum.prettier),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/commitlint.config.cjs',
        hide: !options.lintTools.includes(LintToolEnum.commitlint),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/.prettierignore',
        hide: !options.lintTools.includes(LintToolEnum.prettier),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/.editorconfig',
        hide: !options.lintTools.includes(LintToolEnum.editorconfig),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/.czrc.cjs',
        hide: !options.lintTools.includes(LintToolEnum.commitlint),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/.husky/commit-msg',
        hide: ![
            LintToolEnum.eslint,
            LintToolEnum.prettier,
            LintToolEnum.stylelint,
            LintToolEnum.commitlint,
        ].some((lintTool) => options.lintTools.includes(lintTool)),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/.husky/pre-commit',
        hide: ![
            LintToolEnum.eslint,
            LintToolEnum.prettier,
            LintToolEnum.stylelint,
            LintToolEnum.commitlint,
        ].some((lintTool) => options.lintTools.includes(lintTool)),
    }),
];
