import type { CreateCommandOptions, OutputFileTask, InteractionConfig } from '@lania-cli/types';
import type { PromptModule } from 'inquirer';
export abstract class BaseTemplate {
    protected abstract tmpDirName: string;
    protected abstract config: ((options: InteractionConfig) => OutputFileTask)[];
    protected abstract createPromptQuestions(
        options: CreateCommandOptions,
    ): Parameters<PromptModule>[0];
    protected abstract getDependenciesArray(options: InteractionConfig): {
        dependencies: string[];
        devDependencies: string[];
    };
    public createOutputTasks(options: InteractionConfig) {
        return this.config.map((taskFn) => {
            const { outputPath = '', hide } = taskFn(options);
            const pathSplitted = outputPath.split('/');
            const basename = (pathSplitted?.[pathSplitted.length - 1] ?? '') + '.ejs';
            console.log({ filepath: `${__dirname}/templates/${basename}`, outputPath, __dirname });
            return {
                hide,
                outputPath,
                filepath: `${__dirname}/templates/${basename}`,
            };
        });
    }
}
