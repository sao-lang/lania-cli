import {
    BuildToolEnum,
    CssProcessorEnum,
    CssToolEnum,
    InteractionConfig,
    LangEnum,
    LintToolEnum
} from '@lania-cli/types';

export default [
    (options: InteractionConfig) => ({
        outputPath: '/webpack.config.cjs',
        hide: options.buildTool !== BuildToolEnum.webpack,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/vite.config.ts',
        hide: options.buildTool !== BuildToolEnum.vite || options.language !== LangEnum.TypeScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/vite.config.js',
        hide: options.buildTool !== BuildToolEnum.vite || options.language !== LangEnum.JavaScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/vite-env.d.ts',
        hide: options.buildTool !== BuildToolEnum.vite || options.language !== LangEnum.TypeScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/tsconfig.json',
        hide: options.language !== LangEnum.TypeScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/tailwind.css',
        hide: !options.cssTools?.includes(CssToolEnum.tailwindcss),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/tailwind.config.cjs',
        hide: !options.cssTools?.includes(CssToolEnum.tailwindcss),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/postcss.config.cjs',
        hide: !options.cssTools?.includes(CssToolEnum.tailwindcss),
    }),
    () => ({ outputPath: '/package.json' }),
    (options: InteractionConfig) => ({
        outputPath: '/src/main.tsx',
        hide: options.language !== LangEnum.TypeScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/main.jsx',
        hide: options.language !== LangEnum.JavaScript,
    }),
    () => ({
        outputPath: '/lan.config.json',
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/index.styl',
        hide: options.cssProcessor !== CssProcessorEnum.stylus,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/index.scss',
        hide: options.cssProcessor !== CssProcessorEnum.sass,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/index.less',
        hide: options.cssProcessor !== CssProcessorEnum.less,
    }),
    () => ({
        outputPath: '/index.html',
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/index.css',
        hide: options.cssProcessor !== CssProcessorEnum.css,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/App.tsx',
        hide: options.language !== LangEnum.TypeScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/App.styl',
        hide: options.cssProcessor !== CssProcessorEnum.stylus,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/App.scss',
        hide: options.cssProcessor !== CssProcessorEnum.sass,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/App.less',
        hide: options.cssProcessor !== CssProcessorEnum.less,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/App.jsx',
        hide: options.language !== LangEnum.JavaScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/src/App.css',
        hide: options.cssProcessor !== CssProcessorEnum.css,
    }),
    () => ({
        outputPath: '/.gitignore',
    }),
    () => ({
        outputPath: '/.env.production',
        hide: true,
    }),
    () => ({
        outputPath: '/.env.development',
        hide: true,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/eslint.config.js',
        hide: !options.lintTools.incluces(LintToolEnum.eslint)
    }),
    (options: InteractionConfig) => ({
        outputPath: '/stylelint.config.js',
        hide: !options.lintTools.incluces(LintToolEnum.stylelint)
    }),
    (options: InteractionConfig) => ({
        outputPath: '/prettier.config.js',
        hide: !options.lintTools.incluces(LintToolEnum.prettier)
    }),
    (options: InteractionConfig) => ({
        outputPath: '/commitlint.config.js',
        hide: !options.lintTools.incluces(LintToolEnum.commitlint)
    }),
    (options: InteractionConfig) => ({
        outputPath: '/.eslintignore',
        hide: !options.lintTools.incluces(LintToolEnum.eslint)
    }),(options: InteractionConfig) => ({
        outputPath: '/.stylelintignore',
        hide: !options.lintTools.incluces(LintToolEnum.stylelint)
    }),
    (options: InteractionConfig) => ({
        outputPath: '/.prettierignore',
        hide: !options.lintTools.incluces(LintToolEnum.prettier)
    }),
];
