import inquirer from 'inquirer';
import { to, EjsRenderer, PackageManagerFactory, TaskProgressManager } from '@lania-cli/common';
import { SpaReactTemplate, TemplateFactory } from '@lania-cli/templates';
import latestVersion from 'latest-version';
import getPort from 'get-port';
import { CreateCommandOptions, TemplateOptions } from '@lania-cli/types';

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
        const engine = new EjsRenderer();
        const taskProgressManager = new TaskProgressManager(true, false);
        taskProgressManager.init('OutputFiles', tasks.length);
        for (const task of tasks) {
            // eslint-disable-next-line prefer-const
            let { outputPath, hide, content } = await task;
            if (hide || !content) {
                continue;
            }
            outputPath = options.directory ? `${options.directory}${outputPath}` : outputPath;
            const [compileErr] = await to(
                engine.renderFromString(
                    content,
                    options as Record<string, any>,
                    `${process.cwd()}${outputPath}`,
                ),
            );
            if (compileErr) {
                throw compileErr;
            }
            taskProgressManager.increment('OutputFiles', 1);
        }
    }
    private async downloadDependencies() {
        const taskProgressManager = new TaskProgressManager(true, false);
        taskProgressManager.init('DownloadDependencies', 1);
        const packageManager = await PackageManagerFactory.create(this.options.packageTool as any);
        const [installErr] = await to(packageManager.install({ silent: true }));
        if (installErr) {
            throw installErr;
        }
        taskProgressManager.increment('DownloadDependencies', 1);
    }
    public async build(options: CreateCommandOptions) {
        const taskProgressManager = new TaskProgressManager(true, false);
        taskProgressManager.init('Build', 1);
        const answers = (await this.prompt(options)) as any;
        this.options = {
            ...answers,
            ...options,
            packageTool: options.packageManager || answers.packageTool,
        };
        const [getErr, result] = await to(this.getDependencies(this.options));
        if (getErr) {
            throw getErr;
        }
        taskProgressManager.increment('Build', 1);
        this.options = { ...this.options, ...result };
        await this.outputFiles(this.options);
        !options.skipInstall && (await this.downloadDependencies());
    }
}
