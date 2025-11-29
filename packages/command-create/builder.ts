import {
    to,
    EjsRenderer,
    PackageManagerFactory,
    TaskProgressManager,
    TaskExecutor,
    simplePromptInteraction,
    NpmPackageManager,
} from '@lania-cli/common';
import { SpaReactTemplate, SpaVueTemplate, TemplateFactory } from '@lania-cli/templates';
import latestVersion from 'latest-version';
import getPort from 'get-port';
import {
    CreateCommandOptions,
    CssProcessorEnum,
    DependencyAndVersion,
    InteractionConfig,
    PackageManagerEnum,
    PrettierSupportFileType,
    Question,
} from '@lania-cli/types';
import { Prettier } from '@lania-cli/linters';

export class Builder {
    private options: InteractionConfig = {} as any;
    private template: SpaReactTemplate | SpaVueTemplate;
    private async prompt(options: CreateCommandOptions) {
        const templateList = await TemplateFactory.list();
        const { projectType } = await simplePromptInteraction({
            type: 'list',
            message: 'Please select project template:',
            name: 'projectType',
            choices: templateList,
        });
        this.template = TemplateFactory.create(projectType);
        const choices = this.template.createPromptQuestions({ ...options, projectType });
        const answers = await simplePromptInteraction(choices as Question[]);
        answers.useCssProcessor = answers.cssProcessor !== CssProcessorEnum.css;
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
        dependency: string | DependencyAndVersion,
    ) {
        const isStringDep = typeof dependency === 'string';
        const depName = isStringDep ? dependency : dependency.key;
        const getVersionFlag = isStringDep || (!isStringDep && !dependency.version);
        const depVersion = getVersionFlag ? await latestVersion(depName) : dependency.version;
        if (depVersion) {
            dependencyMap[depName] = depVersion;
        }
    }
    private async outputFiles(options: InteractionConfig) {
        this.options.port = await getPort();
        const engine = new EjsRenderer(async (code, fileType) => {
            const prettierConfig = {
                tabWidth: 4,
                useTabs: false,
                semi: true,
                singleQuote: true,
            };
            return await new Prettier().formatContent(
                code,
                prettierConfig,
                fileType as PrettierSupportFileType,
            );
        });
        const taskProgressManager = new TaskProgressManager('spinner');
        const tmpTasks = await this.template.createOutputTasks(options);
        const tasks = tmpTasks
            .filter((task) => !task.hide)
            .map((task) => {
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
            });
        taskProgressManager.init('OutputFiles', tasks.length);
        const taskExecutor = new TaskExecutor(tasks, {
            maxConcurrency: 5,
            stopOnError: true,
        });
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
        Object.assign(this.options, result);
        const packageManager = PackageManagerFactory.create(this.options.packageManager);
        await packageManager.init();
        await this.outputFiles(this.options);
        !options.skipInstall && (await this.downloadDependencies());
        result.devDependencies['husky'] && new NpmPackageManager().runScript('prepare');
    }
}
