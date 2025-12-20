import {
    BuildToolEnum,
    LangEnum,
    InteractionConfig,
    CssToolEnum,
    DependencyAndVersion,
} from '@lania-cli/types';
import config from './config';
import {
    TAILWIND_DEV_DEPENDENCIES,
    TYPESCRIPT_DEV_DEPENDENCIES,
    REACT_DEPENDENCIES,
    getWebpackDevDependencies,
    VITE_DEV_DEPENDENCIES,
    getLintDevPenpencies,
} from './dependencies';
import questions from './questions';
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
            return [...REACT_DEPENDENCIES];
        },
        devDependencies(options: InteractionConfig) {
            const devDependencies: (string | DependencyAndVersion)[] = [options.buildTool];
            const buildToolDevDependencies = getBuildToolDevDependencies(options);
            const lintToolDevDependencies = getLintDevPenpencies(options);
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
        },
    },
};
