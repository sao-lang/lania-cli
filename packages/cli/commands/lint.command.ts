import { Command } from 'commander';
import { getLanConfig } from './command.util';
import { LINTERS } from '@lib/constants/cli.constant';
import { series } from '@utils/task';
import Prettier from '@linters/prettier.linter.new';
import EsLinter from '@linters/eslint.linter.new';
import StyleLinter from '@linters/stylelint.linter.new';
import { LaniaCommand } from './command.base';

type LintActionHandleConfigsParam = string[];

type LinterMap = {
    prettier: Prettier;
    eslint: EsLinter;
    stylelint: StyleLinter;
};

class LintAction {
    public async handle(linterConfigs: LintActionHandleConfigsParam, fix = false) {
        const linters = this.transformParams(linterConfigs);
        if (!linters.length) {
            throw new Error('Please specify linter!');
        }
        series(
            linters.map((linter) => {
                return async () => {
                    const checkLinter = this.switchLinter(linter as keyof LinterMap, fix);
                    await checkLinter.lint(process.cwd());
                };
            }),
        );
    }
    private transformParams(linterConfigs: string[]) {
        if (!Array.isArray(linterConfigs)) {
            return [];
        }
        return linterConfigs.filter((linter) => LINTERS.includes(linter));
    }
    private switchLinter<T extends keyof LinterMap>(
        linter: T,
        fix?: boolean,
    ): LinterMap[T] | undefined {
        const cwd = process.cwd();
        switch (linter) {
            case 'prettier':
                return new Prettier('prettier', {
                    ignorePath: `${cwd}/.prettierignore`,
                    fix,
                }) as LinterMap[T];
            case 'eslint':
                return new EsLinter('eslint', {
                    ignorePath: `${cwd}/.eslintignore`,
                    fix,
                }) as LinterMap[T];
            case 'stylelint':
                return new StyleLinter('stylelint', {
                    ignorePath: `${cwd}/.stylelintignore`,
                    fix,
                }) as LinterMap[T];
            default:
                return undefined;
        }
    }
}
export default class LintCommand extends LaniaCommand {
    public load(program: Command) {
        program
            .command('lint')
            .description('Lint the code.')
            .option(
                '-l, --linter <names>',
                'The linters that lint code.',
                (value, previous) => {
                    return previous.concat([value]);
                },
                [],
            )
            .option(
                '-f, --fix',
                'Check whether the code needs to be modified when the linters lint the code.',
            )
            .alias('-l')
            .action(async ({ linter, fix }) => {
                if (linter) {
                    await new LintAction().handle(linter, fix);
                    return;
                }
                const { linters } = await getLanConfig();
                await new LintAction().handle(linters ?? [], fix);
            });
    }
}
