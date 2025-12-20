import {
    BuildToolEnum,
    LangEnum,
    InteractionConfig,
    CssToolEnum,
    DependencyAndVersion,
} from '@lania-cli/types';

import config from './config';
import questions from './questions';

import {
    TAILWIND_DEV_DEPENDENCIES,
    TYPESCRIPT_DEV_DEPENDENCIES,
    VUE_DEPENDENCIES,
    getWebpackDevDependencies,
    VITE_DEV_DEPENDENCIES,
    getLintDevPenpencies,
} from './dependencies';

const getBuildToolDevDependencies = (options: InteractionConfig) => {
    if (options.buildTool === BuildToolEnum.webpack) {
        return getWebpackDevDependencies(options);
    }
    if (options.buildTool === BuildToolEnum.vite) {
        return VITE_DEV_DEPENDENCIES;
    }
    return [];
};

export default {
    config,
    questions,
    dependencies: {
        dependencies() {
            return [...VUE_DEPENDENCIES];
        },
        devDependencies(options: InteractionConfig) {
            const devDependencies: (string | DependencyAndVersion)[] = [options.buildTool];
            devDependencies.push(...getBuildToolDevDependencies(options));
            devDependencies.push(...getLintDevPenpencies(options));
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
        },
    },
};
