import {
    BuildToolEnum,
    CssProcessorEnum,
    CssToolEnum,
    InteractionConfig,
    LangEnum,
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
        hide: options.cssTools?.includes(CssToolEnum.tailwindcss),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/tailwind.config.cjs',
        hide: options.cssTools?.includes(CssToolEnum.tailwindcss),
    }),
    (options: InteractionConfig) => ({
        outputPath: '/postcss.config.cjs',
        hide: options.cssTools?.includes(CssToolEnum.tailwindcss),
    }),
    () => ({ outputPath: '/package.json' }),
    (options: InteractionConfig) => ({
        outputPath: '/main.tsx',
        hide: options.language !== LangEnum.TypeScript,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/main.jsx',
        hide: options.language !== LangEnum.JavaScript,
    }),
    () => ({
        outputPath: '/lan.config.json',
    }),
    (options: InteractionConfig) => ({
        outputPath: '/index.styl',
        hide: options.cssProcessor !== CssProcessorEnum.stylus,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/index.scss',
        hide: options.cssProcessor !== CssProcessorEnum.sass,
    }),
    (options: InteractionConfig) => ({
        outputPath: '/index.less',
        hide: options.cssProcessor !== CssProcessorEnum.less,
    }),
    () => ({
        outputPath: '/index.html',
    }),
    (options: InteractionConfig) => ({
        outputPath: '/index.css',
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
        hide: options.cssProcessor === CssProcessorEnum.less,
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
];
