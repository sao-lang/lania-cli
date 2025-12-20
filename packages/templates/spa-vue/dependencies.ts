import {
    CssProcessorEnum,
    type DependencyAndVersion,
    type InteractionConfig,
    LangEnum,
    LintToolEnum,
} from '@lania-cli/types';

export const TYPESCRIPT_DEV_DEPENDENCIES = ['vue-tsc', 'typescript', '@types/node'];

export const TAILWIND_DEV_DEPENDENCIES = ['tailwindcss', 'postcss', 'autoprefixer'];

export const STYLELINT_DEV_DEPENDENCIES = ['stylelint', 'stylelint-config-standard'];

export const STYLELINT_SASS_DEV_DEPENDENCIES = ['stylelint-config-standard-scss', 'postcss-scss'];

export const STYLELINT_PRETTIER_DEV_DEPENDENCIES = ['stylelint-config-prettier'];

export const STYLELINT_LESS_DEV_DEPENDENCIES = ['postcss-less'];
export const STYLELINT_STYLUS_DEV_DEPENDENCIES = [];
export const VUE_DEPENDENCIES = ['vue'];

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
        '@babel/core',
        '@babel/preset-env',
        'babel-loader',
        'copy-webpack-plugin',
        'cross-env',
        'css-loader',
        'css-minimizer-webpack-plugin',
        'html-webpack-plugin',
        'mini-css-extract-plugin',
        'postcss-preset-env',
        'vue-loader',
        'vue-style-loader',
        'postcss-loader',
        'webpack-bundle-analyzer',
        '@vue/babel-plugin-jsx',
        'terser-webpack-plugin',
        ...(options.language === LangEnum.TypeScript
            ? ['ts-loader', '@babel/preset-typescript']
            : []),
        createCssProcessorLoader(options),
        'thread-loader',
    ].filter(Boolean);

export const VITE_DEV_DEPENDENCIES = [
    '@vitejs/plugin-vue',
    'vite-plugin-compression',
    'vite-plugin-vue-setup-extend',
    'terser',
    'rollup-plugin-visualizer',
    '@vitejs/plugin-vue-jsx',
];

export const getLintDevPenpencies = (
    options: InteractionConfig,
): (string | DependencyAndVersion)[] => {
    const depsMap = new Map<string, string | DependencyAndVersion>();
    const { lintTools, useTs, cssProcessor } = options;
    const hasLintTool = (tool: LintToolEnum) => lintTools.includes(tool);
    const addDep = (dep: string | DependencyAndVersion) => {
        const key = typeof dep === 'string' ? dep : dep.key;
        depsMap.set(key, typeof dep === 'string' ? dep : { key, version: dep.version });
    };
    const lintToolDepsMap: Record<
        | LintToolEnum.eslint
        | LintToolEnum.prettier
        | LintToolEnum.stylelint
        | LintToolEnum.commitlint,
        (string | DependencyAndVersion)[]
    > = {
        [LintToolEnum.eslint]: [
            '@eslint/js',
            'eslint-plugin-vue',
            'eslint',
            'globals',
            'vue-eslint-parser',
        ],
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
            [
                'typescript-eslint',
                '@typescript-eslint/parser',
                '@typescript-eslint/eslint-plugin',
            ].forEach(addDep);
        }

        if (hasLintTool(LintToolEnum.prettier)) {
            ['eslint-config-prettier', 'eslint-plugin-prettier'].forEach(addDep);
        }
    };

    const handleStylelintExtras = () => {
        if (!hasLintTool(LintToolEnum.stylelint)) return;

        if (hasLintTool(LintToolEnum.prettier)) {
            ['stylelint-prettier', 'stylelint-config-prettier', 'stylelint-prettier'].forEach(
                addDep,
            );
        }
        const stylelintCssProcessorDeps: Partial<Record<CssProcessorEnum, string[]>> = {
            [CssProcessorEnum.less]: [
                'postcss',
                'postcss-less',
                'stylelint-config-standard-less',
                'stylelint-config-standard-vue',
                'postcss-html',
            ],
            [CssProcessorEnum.sass]: [
                'postcss',
                'stylelint-config-standard-vue',
                'stylelint-config-standard-scss',
                'postcss-html',
            ],
            [CssProcessorEnum.stylus]: [],
        };
        stylelintCssProcessorDeps[cssProcessor]?.forEach(addDep);
    };
    addLintToolDeps();
    handleESLintExtras();
    handleStylelintExtras();

    return Array.from(depsMap.values());
};
