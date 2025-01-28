import { getLanConfig } from './command.util';
import { LINTERS } from '@lania-cli/common';
import { series } from '@utils/task';
import Prettier from '@linters/prettier.linter.new';
import EsLinter from '@linters/eslint.linter.new';
import StyleLinter from '@linters/stylelint.linter.new';
import { LaniaCommand } from './command.base';
import {
    LaniaCommandActionInterface,
    LintActionHandleConfigsParam,
    LintActionOptions,
    LintToolEnum,
    LinterConfigItem,
} from '@lania-cli/types';

type LinterMap = {
    prettier: Prettier;
    eslint: EsLinter;
    stylelint: StyleLinter;
};

class LintAction implements LaniaCommandActionInterface<[LintActionOptions]> {
    public async handle(options: LintActionOptions) {
        const { linters, fix = false } = options;
        const transformedLinters = await this.transformParams(linters);
        if (!transformedLinters.length) {
            throw new Error('Please specify linter!');
        }
        series(
            transformedLinters.map((linter) => {
                return async () => {
                    const target = typeof linter === 'string' ? linter : linter.linter;
                    const checkLinter = this.switchLinter(
                        target as keyof LinterMap,
                        (linter as LinterConfigItem)?.config,
                        fix,
                    );
                    await checkLinter.lint(__cwd);
                };
            }),
        );
    }
    private async transformParams(linterConfigs: LintActionHandleConfigsParam) {
        const finalLinterConfigs = await this.getLinterConfigs(linterConfigs as string[]);
        if (!Array.isArray(finalLinterConfigs)) {
            return [];
        }
        return finalLinterConfigs.filter((linter) =>
            LINTERS.includes(
                (typeof linter === 'string' ? linter : linter?.linter) as LintToolEnum,
            ),
        );
    }
    private async getLinterConfigs(linter?: string[]) {
        if (linter) {
            return linter;
        }
        const { linters } = await getLanConfig();
        return linters;
    }
    private switchLinter<T extends keyof LinterMap>(
        linter: T,
        config?: Record<string, any>,
        fix?: boolean,
    ): LinterMap[T] | undefined {
        const cwd = __cwd;
        switch (linter) {
            case 'prettier':
                return new Prettier(config || 'prettier', {
                    ignorePath: `${cwd}/.prettierignore`,
                    fix,
                }) as LinterMap[T];
            case 'eslint':
                return new EsLinter(config || 'eslint', {
                    ignorePath: `${cwd}/.eslintignore`,
                    fix,
                }) as LinterMap[T];
            case 'stylelint':
                return new StyleLinter(config || 'stylelint', {
                    ignorePath: `${cwd}/.stylelintignore`,
                    fix,
                }) as LinterMap[T];
            default:
                return undefined;
        }
    }
}
export default class LintCommand extends LaniaCommand<[LintActionOptions]> {
    protected actor = new LintAction();
    protected commandNeededArgs = {
        name: 'lint',
        description: 'Lint the code.',
        options: [
            {
                flags: '-l, --linters <names>',
                description: 'The linters that lint code.',
                defaultValue: [],
            },
            {
                flags: '-f, --fix',
                description:
                    'Check whether the code needs to be modified when the linters lint the code.',
            },
        ],
        alias: '-l',
    };
}
