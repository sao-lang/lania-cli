import {
    CssProcessorEnum,
    DepencencyAndVresion,
    InteractionConfig,
    LangEnum,
    LintToolEnum,
} from '@lania-cli/types';

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

export const getWebpackDevDependencies = (options: InteractionConfig) =>
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

export const getLintDevPenpencies = (
    options: InteractionConfig,
): (string | DepencencyAndVresion)[] => {
    const depsMap = new Map<string, string | DepencencyAndVresion>();
    const { lintTools, useTs, cssProcessor } = options;
    const hasLintTool = (tool: LintToolEnum) => lintTools.includes(tool);
    const addDep = (dep: string | DepencencyAndVresion) => {
        const key = typeof dep === 'string' ? dep : dep.key;
        depsMap.set(key, typeof dep === 'string' ? dep : { key, version: dep.version });
    };
    const lintToolDepsMap: Record<
        | LintToolEnum.eslint
        | LintToolEnum.prettier
        | LintToolEnum.stylelint
        | LintToolEnum.commitlint,
        (string | DepencencyAndVresion)[]
    > = {
        [LintToolEnum.eslint]: ['eslint', 'eslint-plugin-react', '@eslint/js'],
        [LintToolEnum.prettier]: ['prettier'],
        [LintToolEnum.commitlint]: [
            '@commitlint/cli',
            '@commitlint/config-conventional',
            'commitizen',
            'cz-customizable',
        ],
        [LintToolEnum.stylelint]: ['stylelint', 'stylelint-config-standard'],
    };

    const addLintToolDeps = () => {
        lintTools.forEach((tool, index) => {
            if (index === 0) {
                ['husky', 'lint-staged'].forEach(addDep);
            }
            lintToolDepsMap[tool]?.forEach(addDep);
        });
    };

    const handleESLintExtras = () => {
        if (!hasLintTool(LintToolEnum.eslint)) return;

        if (useTs) {
            ['typescript-eslint'].forEach(addDep);
        }

        if (hasLintTool(LintToolEnum.prettier)) {
            ['eslint-config-prettier', 'eslint-plugin-prettier'].forEach(addDep);
        }
    };

    const handleStylelintExtras = () => {
        if (!hasLintTool(LintToolEnum.stylelint)) return;

        if (hasLintTool(LintToolEnum.prettier)) {
            addDep('stylelint-config-prettier');
        }
        const stylelintCssProcessorDeps: Partial<Record<CssProcessorEnum, string[]>> = {
            [CssProcessorEnum.less]: ['postcss', 'postcss-less'],
            [CssProcessorEnum.sass]: ['postcss', 'postcss-scss', ,],
            [CssProcessorEnum.stylus]: ['postcss', 'stylelint-stylus', 'postcss-styl'],
        };
        stylelintCssProcessorDeps[cssProcessor]?.forEach(addDep);
    };
    addLintToolDeps();
    handleESLintExtras();
    handleStylelintExtras();

    return Array.from(depsMap.values());
};
