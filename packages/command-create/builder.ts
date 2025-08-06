import {
    to,
    EjsRenderer,
    PackageManagerFactory,
    TaskProgressManager,
    CliInteraction,
    TaskExecutor,
} from '@lania-cli/common';
import { SpaReactTemplate, TemplateFactory } from '@lania-cli/templates';
import latestVersion from 'latest-version';
import getPort from 'get-port';
import {
    CreateCommandOptions,
    CssProcessorEnum,
    DepencencyAndVresion,
    InteractionConfig,
    PackageManagerEnum,
    PrettierSupportFileType,
    Question,
} from '@lania-cli/types';
import { Prettier } from '@lania-cli/linters';

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
        answers.useCssProcessor = answers.cssProcessor === CssProcessorEnum.css ? false : true;
        answers.useTs = true;
        return { ...answers, projectType } as InteractionConfig;
    }
    private async getDependencies(options: InteractionConfig) {
        const taskProgressManager = new TaskProgressManager('spinner');
        const { dependencies, devDependencies } = this.template.getDependenciesArray(
            options as InteractionConfig,
        );
        taskProgressManager.init('GetDependencies', dependencies.length + devDependencies.length);
        const dependenciesMap: Record<string, string> = {};
        const devDependenciesMap: Record<string, string> = {};
        const taskExecutor = new TaskExecutor(
            [
                ...dependencies.map((dependency) => {
                    return {
                        task: async () => {
                            await this.insertDependencyVersion(dependenciesMap, dependency);
                            taskProgressManager.increment('GetDependencies', 1);
                        },
                        group: 'getDependenciesVersion',
                    };
                }),
                ...devDependencies.map((devDependency) => {
                    return {
                        task: async () => {
                            await this.insertDependencyVersion(devDependenciesMap, devDependency);
                            taskProgressManager.increment('GetDependencies', 1);
                        },
                        group: 'getDevDependenciesVersion',
                    };
                }),
            ],
            {
                maxConcurrency: 10,
                stopOnError: true,
            },
        );
        await taskExecutor.run();
        return { dependencies: dependenciesMap, devDependencies: devDependenciesMap };
    }
    private async insertDependencyVersion(
        dependencyMap: Record<string, string>,
        dependency: string | DepencencyAndVresion,
    ) {
        const isStringDep = typeof dependency === 'string';
        const depName = isStringDep ? dependency : dependency.key;
        const depVersion = isStringDep ? await latestVersion(dependency) : dependency.version;
        if (depVersion) {
            dependencyMap[depName] = depVersion;
        }
    }
    private async outputFiles(options: InteractionConfig) {
        this.options.port = await getPort();
        console.log(options, 'options')
        const tasks = (await this.template.createOutputTasks(options)).filter((task) => !task.hide);
        const engine = new EjsRenderer((code, fileType) =>
            new Prettier().formatContent(
                code,
                {
                    tabWidth: 4,
                    useTabs: false,
                    semi: true,
                    singleQuote: true,
                },
                fileType as PrettierSupportFileType,
            ),
        );
        const taskProgressManager = new TaskProgressManager('spinner');
        taskProgressManager.init('OutputFiles', tasks.length);
        const taskExecutor = new TaskExecutor(
            tasks.map((task) => {
                return {
                    task: async () => {
                        const { outputPath, filepath } = task;
                        const { directory } = options;
                        const finalPath = directory ? `${directory}${outputPath}` : outputPath;
                        const [compileErr] = await to(
                            engine.renderFromFile(
                                filepath,
                                options,
                                `${process.cwd()}${finalPath}`,
                            ),
                        );
                        if (compileErr) {
                            throw compileErr;
                        }
                        taskProgressManager.increment('OutputFiles', 1);
                    },
                };
            }),
            {
                maxConcurrency: 5,
                stopOnError: true,
            },
        );
        await taskExecutor.run();
    }
    private async downloadDependencies() {
        const taskProgressManager = new TaskProgressManager('spinner');
        taskProgressManager.init('DownloadDependencies', 1);
        const packageManager = await PackageManagerFactory.create(this.options.packageManager);
        const [installErr] = await to(packageManager.install({ silent: true }));
        if (installErr) {
            throw installErr;
        }
        taskProgressManager.increment('DownloadDependencies', 1);
    }
    public async build(options: CreateCommandOptions) {
        const answers = await this.prompt(options);
        this.options = {
            ...answers,
            ...options,
            packageManager: (options.packageManager ||
                answers.packageManager) as PackageManagerEnum,
        } as unknown as InteractionConfig;
        const [getErr, result] = await to(this.getDependencies(this.options));
        if (getErr) {
            throw getErr;
        }
        this.options = { ...this.options, ...result };
        await this.outputFiles(this.options);
        !options.skipInstall && (await this.downloadDependencies());
    }
}
