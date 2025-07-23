import {
    CSS_PROCESSORS,
    CSS_TOOLS,
    LINT_TOOLS,
    UNIT_TEST_TOOLS,
    PACKAGES_MANAGERS,
} from '@lania-cli/common';
import {
    CssProcessorEnum,
    ProjectTypeEnum,
    BuildToolEnum,
    CreateCommandOptions,
} from '@lania-cli/types';

export const createQuestions = (options: CreateCommandOptions & { template: string }) => [
    {
        message: 'Please select a css processor:',
        name: 'cssProcessor',
        choices: CSS_PROCESSORS,
        default: CssProcessorEnum.css,
        when: () => {
            if (
                [ProjectTypeEnum.nodejs, ProjectTypeEnum.toolkit].some(
                    (item) => options.template?.includes(item),
                )
            ) {
                return false;
            }
            return true;
        },
        type: 'list',
    },
    {
        message: 'Please select a css tool:',
        name: 'cssTools',
        choices: [...CSS_TOOLS, { name: 'skip', value: null }],
        default: 'skip',
        when: () => {
            if (
                [ProjectTypeEnum.nodejs, ProjectTypeEnum.toolkit].some(
                    (item) => options.template?.includes(item),
                )
            ) {
                return false;
            }
            return true;
        },
        type: 'checkbox',
    },
    {
        message: 'Please select the lint tools:',
        name: 'lintTools',
        choices: [...LINT_TOOLS, { name: 'skip', value: null }],
        type: 'checkbox',
        default: 'skip',
    },
    {
        message: 'Please select a unit testing tool',
        name: 'unitTestTool',
        choices: [...UNIT_TEST_TOOLS, { name: 'skip', value: null }],
        type: 'list',
        default: 'skip',
    },
    {
        name: 'buildTool',
        message: 'Please select a build tool:',
        choices: () => {
            const flag = [
                ProjectTypeEnum.spa,
                ProjectTypeEnum.ssr,
                ProjectTypeEnum.nodejs,
                ProjectTypeEnum.vanilla,
            ].some((item) => options.template?.includes(item));
            if (flag) {
                return [BuildToolEnum.webpack, BuildToolEnum.vite];
            }
            return [BuildToolEnum.rollup, BuildToolEnum.tsc];
        },
        type: 'list',
    },
    {
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
    },
];
