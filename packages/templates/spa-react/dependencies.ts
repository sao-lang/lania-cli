import { CssProcessorEnum, InteractionConfig, LangEnum, LintToolEnum } from '@lania-cli/types';

export const TYPESCRIPT_DEV_DEPENDENCIES = [
    '@types/react',
    '@types/react-dom',
    { key: 'typescript', version: '^5.0.4' },
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
): (string | Record<'key' | 'version', string>)[] => {
    const deps = new Set<string | Record<'key' | 'version', string>>();
    const { lintTools, useTs, cssProcessor } = options;
    const hasLintTool = (tool: LintToolEnum) => lintTools.includes(tool);
    // 通用的 husky 和 lint-staged 依赖
    if (
        [
            LintToolEnum.eslint,
            LintToolEnum.prettier,
            LintToolEnum.stylelint,
            LintToolEnum.commitlint,
        ].some(hasLintTool)
    ) {
        deps.add('husky');
        deps.add('lint-staged');
        if ([LintToolEnum.commitlint].some(hasLintTool)) {
            deps.add('commitizen');
            deps.add('cz-customizable')
        }
    }
    // eslint 相关依赖配置
    const eslintDeps = [
        {
            key: 'eslint',
            version: 'R^8.43.0',
        },
        {
            key: 'eslint-plugin-react',
            version: '^7.32.2',
        },
    ];
    // stylelint cssProcessor 相关依赖配置
    const stylelintCssProcessorDeps: Record<
        CssProcessorEnum.less | CssProcessorEnum.sass | CssProcessorEnum.stylus,
        (string | Record<'key' | 'version', string>)[]
    > = {
        [CssProcessorEnum.less]: [
            { key: 'postcss', version: '^8.4.12' },
            { key: 'postcss-less', version: '^6.0.0' },
        ],
        [CssProcessorEnum.sass]: [
            {
                key: 'postcss',
                version: '^8.4.12',
            },
            {
                key: 'postcss-scss',
                version: '^4.0.6',
            },
        ],
        [CssProcessorEnum.stylus]: [
            {
                key: 'postcss',
                version: '^8.4.12',
            },
            {
                key: 'stylelint-stylus',
                version: '^0.18.0',
            },
            {
                key: 'postcss-styl',
                version: '^0.12.3',
            },
        ],
    };
    // 定义 lintTool 到依赖数组的映射
    const lintToolDepsMap: Record<
        | LintToolEnum.eslint
        | LintToolEnum.commitlint
        | LintToolEnum.prettier
        | LintToolEnum.stylelint,
        (string | { key: string; version: string })[]
    > = {
        [LintToolEnum.eslint]: eslintDeps,
        [LintToolEnum.prettier]: [{ key: 'prettier', version: '^2.8.8' }],
        [LintToolEnum.commitlint]: ['@commitlint/cli', '@commitlint/config-conventional'],
        [LintToolEnum.stylelint]: ['stylelint', 'stylelint-config-standard'],
    };
    // 根据选中的 lintTools 添加基础依赖
    lintTools.forEach((tool) => {
        const baseDeps = lintToolDepsMap[tool];
        if (baseDeps) {
            baseDeps.forEach((d) => deps.add(d));
        }
    });
    // eslint 特殊处理
    if (hasLintTool(LintToolEnum.eslint)) {
        if (useTs) {
            deps.add('@typescript-eslint/parser');
            deps.add('@typescript-eslint/eslint-plugin');
        }
        if (hasLintTool(LintToolEnum.prettier)) {
            deps.add({
                key: 'eslint-config-prettier',
                version: '^8.8.0',
            });
            deps.add({
                key: 'eslint-plugin-prettier',
                version: '^4.2.1',
            });
        }
    }
    // stylelint 特殊处理
    if (hasLintTool(LintToolEnum.stylelint)) {
        deps.add({ key: 'stylelint-config-standard', version: '^23.0.0' });
        deps.add({ key: 'stylelint', version: '^14.6.0' });
        if (hasLintTool(LintToolEnum.prettier)) {
            deps.add({ key: 'stylelint-config-prettier', version: '^9.0.5' });
        }
        if (cssProcessor in stylelintCssProcessorDeps) {
            stylelintCssProcessorDeps[cssProcessor].forEach((d) => deps.add(d));
        }
    }

    return Array.from(deps);
};
