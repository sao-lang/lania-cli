import { LangEnum } from '@lania-cli/types';
import config from './config.js';
import questions from './questions.js';
import { VITE_DEV_DEPENDENCIES, getLintDevPenpencies, TYPESCRIPT_DEV_DEPENDENCIES, VITE_DEV_TS_DEPENDENCIES, TEST_DEPENPENCIES, DOC_DEPENPENCIES } from './dependencies.js';

var index = {
    config,
    questions,
    dependencies: {
        dependencies() {
            return [...VITE_DEV_DEPENDENCIES];
        },
        devDependencies(options) {
            const devDependencies = [options.buildTool];
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

export { index as default };
