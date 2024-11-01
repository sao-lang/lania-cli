import { Command } from 'commander';
import { getLanConfig } from './command.util';
import { LINTERS } from '@lib/constants/cli.constant';
import { series } from '@utils/task';
import PrettierLinter from '@linters/prettier.linter';
import EsLinter from '@linters/eslint.linter';
import StyleLinter from '@linters/stylelint.linter';
import { LaniaCommand } from './command.base';

interface LinterConfigItem {
    linter?: string;
    path?: string;
}

type LintActionHandleConfigsParam = string[] | LinterConfigItem[];

type LinterMap = {
    prettier: PrettierLinter;
    eslint: EsLinter;
    stylelint: StyleLinter;
};

class LintAction {
    public async handle(
        linterConfigs: LintActionHandleConfigsParam,
        pathConfigs?: string[],
        fix = false,
    ) {
        const linters = this.transformParams(linterConfigs, pathConfigs);
        if (!linters.length) {
            throw new Error('Please specify linter!');
        }
        series(
            linters.map(({ linter, path }) => {
                return async () => {
                    const checkLinter = this.switchLinter(linter as keyof LinterMap);
                    await checkLinter.lint(path, {}, { fix });
                };
            }),
        );
    }
    private transformParams(linterConfigs: string[] | LinterConfigItem[], pathConfigs?: string[]) {
        if (!Array.isArray(linterConfigs)) {
            return [] as LinterConfigItem[];
        }
        return linterConfigs
            .map((config: string | LinterConfigItem, index: number) => {
                const isString = typeof config === 'string';
                return {
                    linter: isString ? config : config?.linter,
                    path: isString ? pathConfigs[index] : config?.path,
                };
            })
            .filter((linter) => LINTERS.includes(linter.linter));
    }
    private switchLinter<T extends keyof LinterMap>(linter: T): LinterMap[T] | undefined {
        switch (linter) {
            case 'prettier':
                return new PrettierLinter() as LinterMap[T];
            case 'eslint':
                return new EsLinter() as LinterMap[T];
            case 'stylelint':
                return new StyleLinter() as LinterMap[T];
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
            .option(
                '-p, --path <paths>',
                'The configuration file path of the linters.',
                (value, previous) => {
                    return previous.concat([value]);
                },
                [],
            )
            .alias('-l')
            .action(async ({ linter, path, fix }) => {
                if (linter) {
                    await new LintAction().handle(linter, path, fix);
                    return;
                }
                const { linters } = await getLanConfig();
                await new LintAction().handle(linters ?? [], null, fix);
            });
    }
}
