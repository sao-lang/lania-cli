import inquirer from 'inquirer';
import to from '@utils/to';
import { SpaReactTemplate, TemplateFactory } from '@lania-cli/templates';
import latestVersion from 'latest-version';
import loading from '@utils/loading';
import EjsEngine from '@lib/engines/ejs.engine';
import getPort from 'get-port';
import PackageManagerFactory from '@lib/package-managers/package-manager.factory';
import { CreateCommandOptions, TemplateOptions } from '@lania-cli/types';
import { DEFAULT_NO } from '@lania-cli/common';

export class Builder {
    private options: TemplateOptions = {} as any;
    private template: SpaReactTemplate;
    private async prompt(options: CreateCommandOptions) {
        const templateList = await TemplateFactory.list();
        const { template } = await inquirer.prompt({
            type: 'list',
            message: 'Please select project template:',
            name: 'template',
            choices: templateList,
        });
        this.template = TemplateFactory.create(template);
        const choices = this.template.createPromptQuestions(options);
        const answers = await inquirer.prompt(choices);
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
        this.options.port = await getPort();
        const tasks = await this.template.createOutputTasks(options);
        const engine = new EjsEngine();
        for (const task of tasks) {
            // eslint-disable-next-line prefer-const
            let { outputPath, hide, content } = await task;
            if (hide || !content) {
                continue;
            }
            outputPath = options.directory ? `${options.directory}${outputPath}` : outputPath;
            await loading(`Generating ${outputPath}...`, async () => {
                const [compileErr] = await to(
                    engine.render(content, `${__cwd}${outputPath}`, options as Record<string, any>),
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
    public async build(options: CreateCommandOptions) {
        const answers = (await this.prompt(options)) as any;
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
