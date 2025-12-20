import { LINT_TOOLS, UNIT_TEST_TOOLS, PACKAGES_MANAGERS } from '@lania-cli/common';
import { CreateCommandOptions, LintToolEnum, PackageManagerEnum } from '@lania-cli/types';

export default [
    () => ({
        message: 'Should we adopt the monorepo architecture?',
        name: 'isMonorepo',
        type: 'confirm',
        default: false,
    }),
    () => ({
        message: 'Please select the lint tools:',
        name: 'lintTools',
        choices: [...LINT_TOOLS.filter((tool) => ![LintToolEnum.stylelint].includes(tool))],
        type: 'checkbox',
        default: null,
    }),
    () => ({
        message: 'Please select a unit testing tool',
        name: 'unitTestTool',
        choices: [...UNIT_TEST_TOOLS, { name: 'skip', value: null }],
        type: 'list',
        default: null,
    }),
    (options: CreateCommandOptions) => ({
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
        default: PackageManagerEnum.pnpm,
    }),
    (options: CreateCommandOptions) => ({
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
