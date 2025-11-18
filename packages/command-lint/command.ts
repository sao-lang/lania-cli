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
    PrettierOutput,
    TaskResult,
    LaniaConfig,
    ConfigurationGetType,
    LinterHandleDirOptions,
} from '@lania-cli/types';

type LinterMap = {
    prettier: Prettier;
    eslint: EsLinter;
    stylelint: StyleLinter;
};

class LinterResultPrinter {
    private hasError = false;
    private hasWarning = false;
    public print(results: TaskResult<(LinterOutput | PrettierOutput)[][]>[]) {
        /** 分组结果 */
        const grouped = this.groupByLinter(results);
        /** 遍历每个分组并打印 */
        for (const [group, tasks] of grouped) {
            this.printGroupHeader(group);
            for (const task of tasks) {
                if (!task.success || !task.data) {
                    logger.error(`❌ Task failed: ${task.error?.message || 'Unknown error'}\n`);
                    this.hasError = true;
                    continue;
                }
                for (const resultGroup of task.data) {
                    for (const result of resultGroup) {
                        if (result?.lintType === 'prettier') {
                            this.printPrettierResult(result as PrettierOutput);
                        } else {
                            const { errorCount, warningCount } = this.printLinterResult(result as LinterOutput);
                            if (errorCount > 0) this.hasError = true;
                            if (warningCount > 0) this.hasWarning = true;
                        }
                    }
                }
            }
            this.printGroupFooter(group);
        }
        this.printSummary(this.hasError, this.hasWarning);
        this.hasError = this.hasWarning = false;
    }
    private groupByLinter(results: TaskResult<(LinterOutput | PrettierOutput)[][]>[]) {
        const grouped = new Map<string, TaskResult<(LinterOutput | PrettierOutput)[][]>[]>();

        for (const r of results) {
            const name = r.group || 'default';
            if (!grouped.has(name)) grouped.set(name, []);
            grouped.get(name)!.push(r);
        }
        return grouped;
    }
    private printGroupHeader(group: string) {
        logger.log(
            styleText(`\n=== Group: ${group} ===\n`, {
                color: '#9b59b6',
                bold: true,
            }).render(),
        );
    }
    private printGroupFooter(group: string) {
        logger.log(styleText(`=== End of Group: ${group} ===\n`).render());
    }
    private printLinterResult(result: LinterOutput) {
        const { filePath, output, lintType } = result;
        // 标题
        logger.log(
            styleText(`${lintType.toUpperCase()} → ${filePath}`, {
                color: '#00bcd4',
                bold: true,
            }).render(),
        );
        // 无问题
        if (!output || output.length === 0) {
            logger.success('✓ No problems found\n');
            return { errorCount: 0, warningCount: 0 };
        }
        // 输出每个错误 / 警告
        for (const item of output) {
            const { line, column, type, description } = item;
            const icon = type === 'error' ? '✖' : '⚠';
            const message = `${icon} [${type.toUpperCase()}] ${filePath}:${line}:${column} - ${description}`;
            const styled = styleText(message, {
                color: type === 'error' ? '#e74c3c' : '#f39c12',
                bold: true,
            }).render();
            console.log('  ' + styled);
        }
        console.log('');
        return {
            errorCount: result.errorCount,
            warningCount: result.warningCount,
        };
    }
    private printPrettierResult(result: PrettierOutput) {
        if (result.isFormatted) {
            logger.success(`Formatted: ${result.filePath}`);
        } else {
            logger.info(`Already formatted: ${result.filePath}`);
        }
    }
    private printSummary(hasError: boolean, hasWarning: boolean) {
        console.log('\n');
        if (hasError) {
            logger.error('Linting completed with errors.');
        } else if (hasWarning) {
            logger.warn('Linting completed with warnings.');
        } else {
            logger.success('All files passed linting!');
        }
    }
}

class LintAction implements LaniaCommandActionInterface<[LintActionOptions]> {
    private laniaConfig: LaniaConfig;
    private resultPrinter: LinterResultPrinter;
    constructor() {
        this.resultPrinter = new LinterResultPrinter();
    }
    public async handle(options: LintActionOptions) {
        const { linters, fix = false } = options;
        this.laniaConfig = await getLanConfig();
        const transformedLinters = await this.transformLinterParams(linters);
        if (!transformedLinters.length) {
            throw new Error('Please specify linter!');
        }
        const taskProgressManager = new TaskProgressManager('spinner');
        taskProgressManager.init('LintFiles', 1);
        const tasks = transformedLinters.map((linter: keyof LinterMap) => {
            return {
                task: async () => {
                    const checkLinter = await this.switchLinter(linter, linter, fix);
                    return await checkLinter.lint(process.cwd());
                },
                group: linter,
            };
        });
        const taskExecutor = new TaskExecutor(tasks, { maxConcurrency: 1 });
        const results: TaskResult<LinterOutput[][]>[] = await taskExecutor.run();
        taskProgressManager.increment('LintFiles');
        this.resultPrinter.print(results);
    }
    private async transformLinterParams(linterConfigs: LintActionHandleConfigsParam) {
        const finalLinterConfigs = await this.getLinterConfigs(linterConfigs as string[]);
        if (!Array.isArray(finalLinterConfigs)) {
            return [];
        }
        return finalLinterConfigs.filter((linter) => LINTERS.includes(linter as LintToolEnum));
    }
    private async getLinterConfigs(linter?: string[]) {
        if (linter.length) {
            return linter;
        }
        return this.laniaConfig.lintTools;
    }
    private async switchLinter<T extends keyof LinterMap>(
        linter: T,
        config?: ConfigurationGetType,
        fix?: boolean,
    ): Promise<LinterMap[T]> {
        const linterOptions: LinterHandleDirOptions = {
            ignorePath: await this.createIgnoreFilePath(linter),
            fix,
            outerLinter: this.laniaConfig?.lintAdaptors?.[linter],
        };
        if (!linterOptions.ignorePath) {
            delete linterOptions.ignorePath;
        }
        const linterMap = {
            prettier: Prettier,
            eslint: EsLinter,
            stylelint: StyleLinter,
        };
        const LinterCtr = linterMap[linter];
        if (!LinterCtr) {
            return undefined;
        }
        return new LinterCtr(config || 'prettier', linterOptions) as LinterMap[T];
    }
    private async createIgnoreFilePath(linter: keyof LinterMap) {
        const fileExtMap = {
            prettier: '.prettierignore',
            eslint: '.eslintignore',
            stylelint: '.stylelintignore',
        };
        const path = `${process.cwd()}/${fileExtMap[linter]}`;
        return await fileExists(path) ? path : null;
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
            defaultValue: false,
        },
    ],
    alias: '-l',
})
export class LintCommand extends LaniaCommand<[LintActionOptions]> {}

export default LintCommand;
