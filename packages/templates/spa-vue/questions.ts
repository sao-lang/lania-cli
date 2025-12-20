import { CSS_PROCESSORS, CSS_TOOLS, LINT_TOOLS, PACKAGES_MANAGERS } from '@lania-cli/common';
import {
    CssProcessorEnum,
    ProjectTypeEnum,
    BuildToolEnum,
    CreateCommandOptions,
} from '@lania-cli/types';

export default [
    (options: CreateCommandOptions & { projectType: string }) => ({
        message: 'Please select a css processor:',
        name: 'cssProcessor',
        choices: CSS_PROCESSORS,
        default: CssProcessorEnum.css,
        when: () => {
            if (
                [ProjectTypeEnum.nodejs, ProjectTypeEnum.toolkit].some((item) =>
                    options.projectType?.includes(item),
                )
            ) {
                return false;
            }
            return true;
        },
        type: 'list',
    }),

    (options: CreateCommandOptions & { projectType: string }) => ({
        message: 'Please select a css tool:',
        name: 'cssTools',
        choices: [...CSS_TOOLS],
        default: null,
        when: () => {
            if (
                [ProjectTypeEnum.nodejs, ProjectTypeEnum.toolkit].some((item) =>
                    options.projectType?.includes(item),
                )
            ) {
                return false;
            }
            return true;
        },
        type: 'checkbox',
    }),

    () => ({
        message: 'Please select the lint tools:',
        name: 'lintTools',
        choices: [...LINT_TOOLS],
        type: 'checkbox',
        default: null,
    }),

    // (options: CreateCommandOptions & { projectType: string }) => ({
    //     message: 'Please select a unit testing tool',
    //     name: 'unitTestTool',
    //     choices: [...UNIT_TEST_TOOLS, { name: 'skip', value: null }],
    //     type: 'list',
    //     default: null,
    // }),

    (options: CreateCommandOptions & { projectType: string }) => ({
        name: 'buildTool',
        message: 'Please select a build tool:',
        choices: () => {
            const flag = [
                ProjectTypeEnum.spa,
                ProjectTypeEnum.ssr,
                ProjectTypeEnum.nodejs,
                ProjectTypeEnum.vanilla,
            ].some((item) => options.projectType?.includes(item));

            if (flag) {
                return [BuildToolEnum.webpack, BuildToolEnum.vite];
            }
            return [BuildToolEnum.rollup, BuildToolEnum.tsc];
        },
        type: 'list',
    }),

    (options: CreateCommandOptions & { projectType: string }) => ({
        name: 'packageManager',
        message: 'Please select a packaging tool:',
        choices: PACKAGES_MANAGERS,
        when: () => {
            if (options.packageManager) {
                return false;
            }
            return true;
        },
        type: 'list',
    }),

    (options: CreateCommandOptions & { projectType: string }) => ({
        name: 'repository',
        message: 'Please input the repository:',
        when: () => {
            if (options.skipInstall) {
                return false;
            }
            return true;
        },
        type: 'input',
    }),
];
