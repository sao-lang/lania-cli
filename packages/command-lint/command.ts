import {
    LINTERS,
    LaniaCommand,
    getLanConfig,
    TaskExecutor,
    LaniaCommandConfig,
    TaskProgressManager,
} from '@lania-cli/common';
import { Prettier, StyleLinter, EsLinter } from '@lania-cli/linters';
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
        const transformedLinters = await this.transformLinterParams(linters);
        if (!transformedLinters.length) {
            throw new Error('Please specify linter!');
        }
        const taskProgressManager = new TaskProgressManager('spinner');
        taskProgressManager.init('LintFiles', 1);
        const taskExecutor = new TaskExecutor([], { maxConcurrency: 1 });
        taskExecutor.addTasks(
            transformedLinters.map((linter) => {
                return {
                    task: async () => {
                        // const target = typeof linter === 'string' ? linter : linter.linter;
                        const checkLinter = this.switchLinter(
                            linter as keyof LinterMap,
                            (linter as LinterConfigItem)?.config,
                            fix,
                        );
                        return await checkLinter.lint(process.cwd());
                    },
                };
            }),
        );
        const results = await taskExecutor.run();
        taskProgressManager.increment('LintFiles');
        console.log(results, 'res');
    }
    private async transformLinterParams(linterConfigs: LintActionHandleConfigsParam) {
        const finalLinterConfigs = await this.getLinterConfigs(linterConfigs as string[]);
        if (!Array.isArray(finalLinterConfigs)) {
            return [];
        }
        return finalLinterConfigs.filter((linter) =>
            LINTERS.includes(
                // (typeof linter === 'string' ? linter : linter?.linter) as LintToolEnum,
                linter as LintToolEnum,
            ),
        );
    }
    private async getLinterConfigs(linter?: string[]) {
        if (linter.length) {
            return linter;
        }
        const { lintTools } = await getLanConfig();
        return lintTools;
    }
    private switchLinter<T extends keyof LinterMap>(
        linter: T,
        config?: Record<string, any>,
        fix?: boolean,
    ): LinterMap[T] | undefined {
        const cwd = process.cwd();
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

@LaniaCommandConfig(new LintAction(), {
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
})
export class LintCommand extends LaniaCommand<[LintActionOptions]> {}

export default LintCommand;
