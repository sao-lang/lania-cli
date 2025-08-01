import { CssProcessorEnum, InteractionConfig, LangEnum } from '@lania-cli/types';

export const TYPESCRIPT_DEV_DEPENDENCIES = [
    '@types/react',
    '@types/react-dom',
    'typescript',
    '@types/node',
];

export const ESLINT_TYPESCRIPT_DEV_DEPENDENCIES = [
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
];

export const ESLINT_DEV_DEPENDENCIES = [
    'eslint-plugin-react',
    'eslint-plugin-react-hooks',
    'eslint',
];

export const ESLINT_PRETTIER_DEV_DEPENDENCIES = [
    'eslint-config-prettier',
    'eslint-plugin-prettier',
];

export const TAILWIND_DEV_DEPENDENCIES = ['tailwindcss', 'postcss', 'autoprefixer'];

export const STYLELINT_DEV_DEPENDENCIES = ['stylelint', 'stylelint-config-standard'];

export const STYLELINT_SASS_DEV_DEPENDENCIES = ['stylelint-config-standard-scss', 'postcss-scss'];

export const STYLELINT_PRETTIER_DEV_DEPENDENCIES = ['stylelint-config-prettier'];

export const STYLELINT_LESS_DEV_DEPENDENCIES = ['postcss-less'];
export const STYLELINT_STYLUS_DEV_DEPENDENCIES = ['stylelint-plugin-stylus', 'postcss-styl'];
export const REACT_DEPENDENCIES = ['react', 'react-dom'];

export const createCssProcessorLoader = (options: InteractionConfig) => {
    switch (options.cssProcessor) {
        case CssProcessorEnum.css:
            return 'css-loader';
        case CssProcessorEnum.less:
            return 'less-loader';
        case CssProcessorEnum.sass:
            return 'sass-loader';
        case CssProcessorEnum.stylus:
            return 'stylus-loader';
    }
};

export const createWebpackDevDependencies = (options: InteractionConfig) =>
    [
        '@babel/plugin-transform-runtime',
        '@babel/runtime',
        '@babel/preset-env',
        '@babel/core',
        options.language === LangEnum.TypeScript ? '@babel/preset-typescript' : '',
        'html-webpack-plugin',
        'mini-css-extract-plugin',
        'babel-loader',
        'copy-webpack-plugin',
        'css-loader',
        'css-minimizer-webpack-plugin',
        'style-loader',
        'webpack-dev-server',
        'webpackbar',
        'postcss',
        'postcss-loader',
        'postcss-preset-env',
        '@pmmmwh/react-refresh-webpack-plugin',
        '@babel/preset-react',
        'webpack-bundle-analyzer',
        'react-refresh',
        createCssProcessorLoader(options),
        'thread-loader',
        'terser-webpack-plugin',
    ].filter(Boolean);

export const VITE_DEV_DEPENDENCIES = [
    '@vitejs/plugin-react',
    'vite-plugin-compression',
    'terser',
    'rollup-plugin-visualizer',
];

export const getEslintDevPenpencies = (options: InteractionConfig) => {
    
}
