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
import { TemplateFactory, type TemplateOptions, type Template } from '@laniakea/templates';
import latestVersion from 'latest-version';
import loading from '@utils/loading';
import EjsCompiler from '@lib/compilers/ejs.compiler';

export class Builder {
    private options: Record<string, any> = {};
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
    private async outputFiles(options: Record<string, any>) {
        // @ts-ignore
        const tasks = this.template.getOutputFileTasks(options);
        const compiler = new EjsCompiler();
        for (const task of tasks) {
            // @ts-ignore
            // eslint-disable-next-line prefer-const
            let { outputPath, options, hide, content } = await task();
            if (hide || !content) {
                continue;
            }
            outputPath = options.directory ? `${options.directory}/${outputPath}` : outputPath;
            await loading(`Generating ${outputPath}...`, async () => {
                const [compileErr] = await to(
                    compiler.compile(content, `${process.cwd()}/${outputPath}`, options),
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
    public async build(options: CommandCreateOptions) {
        const answers = (await this.prompt(options)) as any;
        this.template = TemplateFactory.create(answers.template);
        this.options = { ...answers, ...options };
        await loading('Preparing dependencies...', async () => {
            const [getErr, result] = await to(this.getDependencies(answers));
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
        // @ts-ignore
        await this.outputFiles({ ...this.options });
        // console.log({ dependencies, devDependencies });
        // this.options = answers;
    }
}
