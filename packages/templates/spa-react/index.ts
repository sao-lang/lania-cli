import {
    BuildToolEnum,
    CreateCommandOptions,
    LangEnum,
    InteractionConfig,
    CssToolEnum,
    DepencencyAndVresion,
} from '@lania-cli/types';
import config from './config';
import { BaseTemplate } from '../base-template';
import {
    TAILWIND_DEV_DEPENDENCIES,
    TYPESCRIPT_DEV_DEPENDENCIES,
    REACT_DEPENDENCIES,
    getWebpackDevDependencies,
    VITE_DEV_DEPENDENCIES,
    getLintDevPenpencies,
} from './dependencies';
import { createQuestions } from './helper';

export class SpaReactTemplate extends BaseTemplate {
    protected config = config;
    static __name = 'spa-react';
    protected tmpDirName = __dirname;
    constructor() {
        super();
    }
    public createPromptQuestions(options: CreateCommandOptions & { projectType: string }) {
        return createQuestions(options);
    }
    public getDependenciesArray(options: InteractionConfig) {
        const dependenciesArray = REACT_DEPENDENCIES;
        const devDependenciesArray: (string | DepencencyAndVresion)[] = this.getDevDependencies(options);
        return {
            dependencies: dependenciesArray,
            devDependencies: devDependenciesArray,
        };
    }
    private getDevDependencies(options: InteractionConfig) {
        const devDependencies: (string | DepencencyAndVresion)[] = [options.buildTool];
        const buildToolDevDependencies = this.getBuildToolDevDependencies(options);
        const lintToolDevDependencies = getLintDevPenpencies(options);
        console.log(lintToolDevDependencies, 'lintToolDevDependencies')
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
            return getWebpackDevDependencies(options);
        }
        if (options.buildTool === BuildToolEnum.vite) {
            return VITE_DEV_DEPENDENCIES;
        }
        return [];
    }
}

export default SpaReactTemplate;
