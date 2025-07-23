import {
    BuildToolEnum,
    CreateCommandOptions,
    CssProcessorEnum,
    LangEnum,
    LintToolEnum,
    ProjectTypeEnum,
    InteractionConfig,
    CssToolEnum,
} from '@lania-cli/types';
import {
    CSS_PROCESSORS,
    CSS_TOOLS,
    LINT_TOOLS,
    PACKAGES_MANAGERS,
    UNIT_TEST_TOOLS,
} from '@lania-cli/common';
import config from './config';
import { BaseTemplate } from '../base-template';
import {
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
    createWebpackDevDependencies,
    VITE_DEV_DEPENDENCIES,
} from './dependencies';
import { createQuestions } from './helper';

export class SpaReactTemplate extends BaseTemplate {
    protected config = config;
    static __name = 'spa-react';
    protected tmpDirName = __dirname;
    constructor() {
        super();
    }
    public createPromptQuestions(options: CreateCommandOptions & { template: string }) {
        return createQuestions(options);
    }
    public combineAnswersWithOptions(answers: Record<string, string | boolean | number>) {
        answers.useCssProcessor = answers.cssProcessor === CssProcessorEnum.css ? false : true;
        answers.useTs = true;
        return Object.keys(answers).reduce(
            (acc, key) => {
                const value = answers[key];
                if (value) {
                    acc[key] = value;
                }
                return acc;
            },
            {} as Record<string, string | boolean | number>,
        );
    }
    public getDependenciesArray(options: InteractionConfig) {
        const dependenciesArray = REACT_DEPENDENCIES;
        const devDependenciesArray: string[] = this.getDevDependencies(options);
        return {
            dependencies: dependenciesArray,
            devDependencies: devDependenciesArray,
        };
    }
    private getDevDependencies(options: InteractionConfig) {
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
        if (options.cssTools?.includes(CssToolEnum.tailwindcss)) {
            devDependencies.push(...TAILWIND_DEV_DEPENDENCIES);
        }
        return devDependencies;
    }
    private getBuildToolDevDependencies(options: InteractionConfig) {
        if (options.buildTool === BuildToolEnum.webpack) {
            return createWebpackDevDependencies(options);
        }
        if (options.buildTool === BuildToolEnum.vite) {
            return VITE_DEV_DEPENDENCIES;
        }
        return [];
    }
    private getLintToolDevDependencies(options: InteractionConfig) {
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
