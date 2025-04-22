import {
    AddCommandOptions,
    BuildToolEnum,
    CreateCommandOptions,
    CssProcessorEnum,
    FrameEnum,
    LangEnum,
    LintToolEnum,
    ProjectTypeEnum,
    TemplateOptions,
} from '@lania-cli/types';
import { BaseTemplate } from '../template.base';
import {
    CSS_PROCESSORS,
    DEFAULT_NO,
    LINT_TOOLS,
    PACKAGE_TOOLS,
    TEMPLATES_CONSTANTS,
    UNIT_TEST_TOOLS,
} from '@lania-cli/common';
const {
    ESLINT_DEV_DEPENDENCIES,
    ESLINT_PRETTIER_DEV_DEPENDENCIES,
    ESLINT_TYPESCRIPT_DEV_DEPENDENCIES,
    STYLELINT_DEV_DEPENDENCIES,
    STYLELINT_LESS_DEV_DEPENDENCIES,
    STYLELINT_PRETTIER_DEV_DEPENDENCIES,
    STYLELINT_SASS_DEV_DEPENDENCIES,
    STYLELINT_STYLUS_DEV_DEPENDENCIES,
    TAILWIND_DEV_DEPENDENCIES,
    TYPESCRIPT_DEV_DEPENDENCIES,
    REACT_DEPENDENCIES,
} = TEMPLATES_CONSTANTS.SPA_REACT_TEMPLATE;

export class SpaReactTemplate extends BaseTemplate {
    static templateName = 'spa-react-template';
    protected templateFilesDirName = __dirname;
    constructor() {
        super();
    }
    public createPromptQuestions(options: CreateCommandOptions) {
        return [
            {
                message: 'Please select a css processor:',
                name: 'cssProcessor',
                choices: CSS_PROCESSORS,
                default: CssProcessorEnum.sass,
                when: ({ template }: { template: string }) => {
                    if (
                        [ProjectTypeEnum.nodejs, ProjectTypeEnum.toolkit].some((item) =>
                            template.includes(item),
                        )
                    ) {
                        return false;
                    }
                    return true;
                },
                type: 'list',
            },
            {
                message: 'Please select the lint tools:',
                name: 'lintTools',
                choices: LINT_TOOLS,
                type: 'checkbox',
            },
            {
                message: 'Please select a unit testing tool',
                name: 'unitTestTool',
                choices: [...UNIT_TEST_TOOLS, DEFAULT_NO],
                type: 'list',
            },
            {
                name: 'buildTool',
                message: 'Please select a build tool:',
                choices: ({ template }: { template: string }) => {
                    const flag = [
                        ProjectTypeEnum.spa,
                        ProjectTypeEnum.ssr,
                        ProjectTypeEnum.nodejs,
                        ProjectTypeEnum.vanilla,
                    ].some((item) => template.includes(item));
                    if (flag) {
                        return [BuildToolEnum.webpack, BuildToolEnum.vite];
                    }
                    return [BuildToolEnum.rollup, BuildToolEnum.gulp, BuildToolEnum.tsc];
                },
                type: 'checkbox',
            },
            {
                name: 'packageTool',
                message: 'Please select a packaging tool:',
                choices: PACKAGE_TOOLS,
                when: () => {
                    if (options.packageManager) {
                        return false;
                    }
                    return true;
                },
                type: 'list',
            },
        ];
    }
    public combineAnswersWithOptions(answers: Record<string, string | boolean | number>) {
        answers.useCssProcessor = answers.cssProcessor === CssProcessorEnum.css ? false : true;
        answers.useTs = true;
        for (const key in answers) {
            if (answers[key] === DEFAULT_NO) {
                delete answers[key];
            }
        }
        return answers;
    }
    public getDependenciesArray(options: TemplateOptions) {
        const dependenciesArray = REACT_DEPENDENCIES;
        const devDependenciesArray: string[] = this.getDevDependencies(options);
        return {
            dependencies: dependenciesArray,
            devDependencies: devDependenciesArray,
        };
    }
    private getDevDependencies(options: TemplateOptions) {
        const devDependencies: string[] = [options.buildTool];
        const buildToolDevDependencies = this.getBuildToolDevDependencies(options);
        const lintToolDevDependencies = this.getLintToolDevDependencies(options);
        devDependencies.push(...buildToolDevDependencies, ...lintToolDevDependencies);
        if (options.language === LangEnum.TypeScript) {
            devDependencies.push(...TYPESCRIPT_DEV_DEPENDENCIES);
        }
        if (options.cssProcessor) {
            devDependencies.push(options.cssProcessor);
        }
        if (options.cssProcessor === CssProcessorEnum.tailwindcss) {
            devDependencies.push(...TAILWIND_DEV_DEPENDENCIES);
        }
        return devDependencies;
    }
    private getBuildToolDevDependencies(options: TemplateOptions) {
        if (options.buildTool === BuildToolEnum.webpack) {
            const isNotTailwindcss = options.cssProcessor !== CssProcessorEnum.tailwindcss;
            return [
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
                isNotTailwindcss ? `${options.cssProcessor}-loader` : '',
                'thread-loader',
                'terser-webpack-plugin',
            ].filter(Boolean);
        }
        if (options.buildTool === 'vite') {
            return [
                '@vitejs/plugin-react',
                'vite-plugin-compression',
                'terser',
                'rollup-plugin-visualizer',
            ];
        }
        return [];
    }
    private getLintToolDevDependencies(options: TemplateOptions) {
        const useEslint = options.lintTools.includes(LintToolEnum.eslint);
        const usePrettier = options.lintTools.includes(LintToolEnum.prettier);
        const useStylelint = options.lintTools.includes(LintToolEnum.stylelint);
        const useEditorConfig = options.lintTools.includes(LintToolEnum.editorconfig);
        const useTs = options.language === LangEnum.TypeScript;
        const devDependencies: string[] = [];
        if (usePrettier) {
            devDependencies.push(LintToolEnum.prettier);
        }
        if (useEslint) {
            devDependencies.push(
                ...ESLINT_DEV_DEPENDENCIES,
                ...(usePrettier ? ESLINT_PRETTIER_DEV_DEPENDENCIES : []),
                ...(useTs ? ESLINT_TYPESCRIPT_DEV_DEPENDENCIES : []),
            );
        }
        if (useEditorConfig) {
            devDependencies.push(LintToolEnum.editorconfig);
        }
        if (useStylelint) {
            devDependencies.push(
                ...STYLELINT_DEV_DEPENDENCIES,
                ...(usePrettier ? STYLELINT_PRETTIER_DEV_DEPENDENCIES : []),
                ...{
                    sass: STYLELINT_SASS_DEV_DEPENDENCIES,
                    less: STYLELINT_LESS_DEV_DEPENDENCIES,
                    stylus: STYLELINT_STYLUS_DEV_DEPENDENCIES,
                }[options.cssProcessor],
            );
        }
        return devDependencies;
    }
}

export default SpaReactTemplate;
