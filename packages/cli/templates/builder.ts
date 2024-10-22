import { CommandCreateOptions } from '@commands/create.command';
import {
    CSS_PROCESSORS,
    LINT_TOOLS,
    PACKAGE_TOOLS,
    UNIT_TEST_TOOLS,
} from '@lib/constants/cli.constant';
import inquirer, { type Answers } from 'inquirer';
import { createCheckboxQuestion, createListQuestion } from './questions';
import to from '@utils/to';
import { TemplateFactory, type TemplateOptions, type Template } from '@lania/templates';
import latestVersion from 'latest-version';
import loading from '@utils/loading';
import EjsEngine from '@lib/engines/ejs.engine';
import PackageManagerFactory from '@lib/package-managers/package-manager.factory';

export class Builder {
    private options: TemplateOptions = {} as any;
    private template: Template;
    private async prompt(options: CommandCreateOptions) {
        const templateList = await TemplateFactory.list();
        const choices: Answers = [
            createListQuestion({
                type: 'list',
                message: 'Please select project template:',
                name: 'template',
                choices: templateList,
            }),
            createListQuestion({
                message: 'Please select a css processor:',
                name: 'cssProcessor',
                choices: CSS_PROCESSORS,
                default: 'sass',
                when: ({ template }: { template: string }) => {
                    if (['nodejs', 'toolkit'].some((item) => template.includes(item))) {
                        return false;
                    }
                    return true;
                },
            }),
            createCheckboxQuestion({
                message: 'Please select the lint tools:',
                name: 'lintTools',
                choices: LINT_TOOLS,
            }),
            createListQuestion({
                message: 'Please select a unit testing tool',
                name: 'unitTestTool',
                choices: [...UNIT_TEST_TOOLS, 'no'],
            }),
            createListQuestion({
                name: 'buildTool',
                message: 'Please select a build tool:',
                choices: ({ template }: { template: string }) => {
                    const flag = ['spa', 'ssr', 'nodejs', 'vanilla'].some((item) =>
                        template.includes(item),
                    );
                    if (flag) {
                        return ['webpack', 'vite'];
                    }
                    return ['rollup', 'gulp', 'tsc'];
                },
            }),
            createListQuestion({
                name: 'packageTool',
                message: 'Please select a packaging tool:',
                choices: PACKAGE_TOOLS,
                when: () => {
                    if (options.packageManager) {
                        return false;
                    }
                    return true;
                },
            }),
        ];
        const answers = await inquirer.prompt(choices);
        if (answers.frame === 'no') {
            answers.frame = undefined;
        }
        if (answers.unitTestTool === 'no') {
            answers.unitTestTool = undefined;
        }
        return answers;
    }
    private async getDependencies(options: TemplateOptions) {
        const { dependencies, devDependencies } = this.template.getDependenciesArray(
            options as TemplateOptions,
        );
        const dependenciesMap: Record<string, string> = {};
        const devDependenciesMap: Record<string, string> = {};
        for (const dependency of dependencies) {
            const version = await latestVersion(dependency);
            if (version) {
                dependenciesMap[dependency] = version;
            }
        }
        for (const devDependency of devDependencies) {
            const version = await latestVersion(devDependency);
            if (version) {
                devDependenciesMap[devDependency] = version;
            }
        }
        return { dependencies: dependenciesMap, devDependencies: devDependenciesMap };
    }
    private async outputFiles(options: TemplateOptions) {
        const tasks = this.template.getOutputFileTasks(options);
        const engine = new EjsEngine();
        for (const task of tasks) {
            // eslint-disable-next-line prefer-const
            let { outputPath, options: taskOptions, hide, content } = await task();
            if (hide || !content) {
                continue;
            }
            outputPath = options.directory ? `${options.directory}${outputPath}` : outputPath;
            await loading(`Generating ${outputPath}...`, async () => {
                const [compileErr] = await to(
                    engine.render(content, `${process.cwd()}${outputPath}`, {
                        ...options,
                        ...taskOptions,
                    }),
                );
                if (compileErr) {
                    return {
                        error: compileErr,
                        status: 'fail',
                        message: `Failed to generate ${outputPath}`,
                    };
                }
                return {
                    error: null,
                    status: 'succeed',
                    message: `Successfully generated ${outputPath}`,
                };
            });
        }
    }
    private async downloadDependencies() {
        await loading('Downloading dependencies...', async () => {
            const packageManager = await PackageManagerFactory.create(
                this.options.packageTool as any,
            );
            const [installErr] = await to(packageManager.install({ silent: true }));
            if (installErr) {
                return {
                    error: installErr,
                    status: 'fail',
                    message: 'Failed to download dependencies!',
                };
            }
            return {
                error: null,
                status: 'succeed',
                message: 'Successfully downloaded dependencies!',
            };
        });
    }
    public async build(options: CommandCreateOptions) {
        const answers = (await this.prompt(options)) as any;
        this.template = TemplateFactory.create(answers.template);
        this.options = {
            ...answers,
            ...options,
            packageTool: options.packageManager || answers.packageTool,
        };
        await loading('Preparing dependencies...', async () => {
            const [getErr, result] = await to(this.getDependencies(this.options));
            if (getErr) {
                return {
                    status: 'fail',
                    message: 'Failed to prepare dependencies',
                    error: getErr,
                };
            }
            this.options = { ...this.options, ...result };
            return {
                status: 'succeed',
                message: 'Successfully prepared dependencies',
                error: null,
            };
        });
        await this.outputFiles(this.options);
        !options.skipInstall && (await this.downloadDependencies());
    }
}
