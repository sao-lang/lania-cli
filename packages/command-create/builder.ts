import {
    to,
    EjsRenderer,
    PackageManagerFactory,
    TaskProgressManager,
    CliInteraction,
} from '@lania-cli/common';
import { SpaReactTemplate, TemplateFactory } from '@lania-cli/templates';
import latestVersion from 'latest-version';
import getPort from 'get-port';
import { CreateCommandOptions, InteractionConfig, Question } from '@lania-cli/types';

export class Builder {
    private options: InteractionConfig = {} as any;
    private template: SpaReactTemplate;
    private async prompt(options: CreateCommandOptions) {
        const templateList = await TemplateFactory.list();
        const { projectType } = await new CliInteraction()
            .addQuestion({
                type: 'list',
                message: 'Please select project template:',
                name: 'projectType',
                choices: templateList,
            })
            .execute();
        this.template = TemplateFactory.create(projectType);
        const choices = this.template.createPromptQuestions({ ...options, projectType });
        const answers = await new CliInteraction().addQuestions(choices as Question[]).execute();
        return { ...answers, projectType };
    }
    private async getDependencies(options: InteractionConfig) {
        const { dependencies, devDependencies } = this.template.getDependenciesArray(
            options as InteractionConfig,
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
    private async outputFiles(options: InteractionConfig) {
        this.options.port = await getPort();
        const tasks = await this.template.createOutputTasks(options);
        const engine = new EjsRenderer();
        const taskProgressManager = new TaskProgressManager('spinner');
        taskProgressManager.init('OutputFiles', tasks.length);
        for (const task of tasks) {
            // eslint-disable-next-line prefer-const
            let { outputPath, hide, filepath } = await task;
            if (hide) {
                continue;
            }
            outputPath = options.directory ? `${options.directory}${outputPath}` : outputPath;
            const [compileErr] = await to(
                engine.renderFromFile(
                    filepath,
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
        const taskProgressManager = new TaskProgressManager('spinner');
        taskProgressManager.init('DownloadDependencies', 1);
        const packageManager = await PackageManagerFactory.create(
            this.options.packageManager as any,
        );
        const [installErr] = await to(packageManager.install({ silent: true }));
        if (installErr) {
            throw installErr;
        }
        taskProgressManager.increment('DownloadDependencies', 1);
    }
    public async build(options: CreateCommandOptions) {
        const taskProgressManager = new TaskProgressManager('spinner');
        const answers = (await this.prompt(options)) as any;
        this.options = {
            ...answers,
            ...options,
            packageManager: options.packageManager || answers.packageManager,
        };
        taskProgressManager.init('Build', 1);
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
