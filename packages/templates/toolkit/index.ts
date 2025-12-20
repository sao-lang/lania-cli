import {
    LangEnum,
    InteractionConfig,
    DependencyAndVersion,
} from '@lania-cli/types';

import config from './config';
import questions from './questions';

import {
    DOC_DEPENPENCIES,
    TEST_DEPENPENCIES,
    TYPESCRIPT_DEV_DEPENDENCIES,
    VITE_DEV_DEPENDENCIES,
    VITE_DEV_TS_DEPENDENCIES,
    getLintDevPenpencies,
} from './dependencies';

export default {
    config,
    questions,
    dependencies: {
        dependencies() {
            return [...VITE_DEV_DEPENDENCIES];
        },
        devDependencies(options: InteractionConfig) {
            const devDependencies: (string | DependencyAndVersion)[] = [options.buildTool];
            // lint tools
            devDependencies.push(...getLintDevPenpencies(options));
            // typescript
            if (options.language === LangEnum.TypeScript) {
                devDependencies.push(...TYPESCRIPT_DEV_DEPENDENCIES, ...VITE_DEV_TS_DEPENDENCIES);
            }
            // unit test
            if (options.unitTestTool) {
                devDependencies.push(...TEST_DEPENPENCIES);
            }
            // docs
            devDependencies.push(...DOC_DEPENPENCIES);
            return devDependencies;
        },
    },
};
