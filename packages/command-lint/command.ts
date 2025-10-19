import {
    LINTERS,
    LaniaCommand,
    getLanConfig,
    TaskExecutor,
    LaniaCommandConfig,
    TaskProgressManager,
    fileExists,
    logger,
    styleText,
} from '@lania-cli/common';
import { Prettier, StyleLinter, EsLinter } from '@lania-cli/linters';
import {
    LinterOutput,
    LaniaCommandActionInterface,
    LintActionHandleConfigsParam,
    LintActionOptions,
    LintToolEnum,
    LinterConfigItem,
    PrettierOutput,
    TaskResult,
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
                        console.log(linter, 'linter');
                        return await checkLinter.lint(process.cwd());
                    },
                    group: linter,
                };
            }),
        );
        const results: TaskResult<LinterOutput[][]>[] = await taskExecutor.run();
        taskProgressManager.increment('LintFiles');
        console.log(JSON.stringify(results), 'res');
        this.printResults(results);
    }
    private printResults(results: TaskResult<(LinterOutput | PrettierOutput)[][]>[]) {
        let hasError = false;
        let hasWarning = false;
        const groupedResults = new Map<string, TaskResult<(LinterOutput | PrettierOutput)[][]>[]>();
        // 按 group 分组
        for (const result of results) {
            const group = result.group || 'default';
            if (!groupedResults.has(group)) {
                groupedResults.set(group, []);
            }
            groupedResults.get(group)!.push(result);
        }
        for (const [group, groupResults] of groupedResults) {
            logger.log(
                styleText(`\n=== Group: ${group} ===\n`, { color: '#9b59b6', bold: true }).render(),
            );

            for (const task of groupResults) {
                if (!task.success || !task.data) {
                    logger.error(`❌ Task failed: ${task.error?.message || 'Unknown error'}\n`);
                    hasError = true;
                    continue;
                }

                for (const resultGroup of task.data) {
                    for (const result of resultGroup) {
                        if ('isFormatted' in result) {
                            // Prettier 结果
                            if (result.isFormatted) {
                                logger.success(`Formatted: ${result.filePath}`);
                            } else {
                                logger.info(`Already formatted: ${result.filePath}`);
                            }
                        } else {
                            const { filePath, output, errorCount, warningCount, lintType } =
                                result as LinterOutput;
                            const header = styleText(`${lintType.toUpperCase()} → ${filePath}`, {
                                color: '#00bcd4',
                                bold: true,
                            }).render();

                            logger.log(header);

                            if (!output || output.length === 0) {
                                logger.success('✓ No problems found');
                                continue;
                            }

                            if (errorCount > 0) hasError = true;
                            if (warningCount > 0) hasWarning = true;

                            for (const item of output) {
                                const { line, column, type, description } = item;
                                const pos =
                                    line != null && column != null ? `${line}:${column}` : '';
                                const jumpHint = `${filePath}:${pos}`; // for editor jump

                                const styledMessage = styleText(
                                    `${
                                        type === 'error' ? '✖' : '⚠'
                                    } [${type.toUpperCase()}] ${jumpHint} - ${description}`,
                                    {
                                        color: type === 'error' ? '#e74c3c' : '#f39c12',
                                        bold: true,
                                    },
                                ).render();

                                console.log('  ' + styledMessage);
                            }

                            console.log(''); // spacer between files
                        }
                    }
                }
            }

            logger.log(styleText(`=== End of Group: ${group} ===\n`).render());
        }

        console.log('\n');

        if (hasError) {
            logger.error('Linting completed with errors.');
        } else if (hasWarning) {
            logger.warn('Linting completed with warnings.');
        } else {
            logger.success('All files passed linting!');
        }
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
        const linterOptions = {
            ignorePath: this.createIgnoreFilePath(linter),
            fix,
        };
        const linterMap = {
            prettier: Prettier,
            eslint: EsLinter,
            stylelint: StyleLinter,
        };
        const linterCtr = linterMap[linter];
        if (!linterCtr) {
            return undefined;
        }
        return new linterCtr(config || 'prettier', linterOptions) as LinterMap[T];
    }
    private createIgnoreFilePath(linter: keyof LinterMap) {
        const fileExtMap = {
            prettier: '.prettierignore',
            eslint: '.eslintignore',
            stylelint: '.stylelintignore',
        };
        const path = `${process.cwd()}/${fileExtMap[linter]}`;
        return fileExists(path) ? path : null;
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
            defaultValue: false
        },
    ],
    alias: '-l',
})
export class LintCommand extends LaniaCommand<[LintActionOptions]> {}

export default LintCommand;
