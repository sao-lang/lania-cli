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
import logger from '@utils/logger';
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
        const [promptErr, answers] = await to(inquirer.prompt(choices));
        if (promptErr) {
            throw promptErr;
        }
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
            const [versionErr, version] = await to(latestVersion(dependency));
            if (versionErr) {
                logger.error(versionErr.message, true);
            }
            if (version) {
                dependenciesMap[dependency] = version;
            }
        }
        for (const devDependency of devDependencies) {
            const [versionErr, version] = await to(latestVersion(devDependency));
            if (versionErr) {
                logger.error(versionErr.message, true);
            }
            if (version) {
                devDependenciesMap[devDependency] = version;
            }
        }
        return { dependencies: dependenciesMap, devDependencies: devDependenciesMap };
    }
    private async outputFiles(options: TemplateOptions) {
        const tasks = this.template.getOutputFileTasks(options);
        const compiler = new EjsCompiler();
        for (const task of tasks) {
            const { templatePath, outputPath, options, hide } = await task();
            if (hide) {
                continue;
            }
            // loading(`Generating ${outputPath}...`, async () => {
            //     const [] = await to(compiler.compile(templatePath, outputPath, options));
            // });
        }
    }
    public async build(options: CommandCreateOptions) {
        const [promptErr, answers] = await to<TemplateOptions>(this.prompt(options) as any);
        if (promptErr) {
            logger.error(promptErr.message, true);
        }
        this.template = TemplateFactory.create(answers.template);
        this.options = answers;
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

        // console.log({ dependencies, devDependencies });
        this.options = answers;
    }
}
