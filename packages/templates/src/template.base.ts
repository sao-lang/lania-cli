import path from 'path';
import fs from 'fs';
import { CreateCommandOptions, OutputFileTask, TemplateOptions } from '@lania-cli/types';
import { PromptModule } from 'inquirer';

export abstract class BaseTemplate {
    static templateName: string = 'base-template';
    protected abstract templateFilesDirName: string;
    protected abstract createPromptQuestions(
        options: CreateCommandOptions,
    ): Parameters<PromptModule>[0];
    protected abstract getDependenciesArray(options: TemplateOptions): {
        dependencies: string[];
        devDependencies: string[];
    };
    public combineAnswersWithOptions(answers: Record<string, string | boolean | number>) {
        return answers;
    }
    public async createOutputTasks(options: TemplateOptions) {
        const files = fs
            .readdirSync(path.resolve(this.templateFilesDirName, './templates'))
            .filter((file) => path.extname(file) === '.js')
            .map((file) => path.resolve(this.templateFilesDirName, `./templates/${file}`));
        return await Promise.all(
            files.map(async (file) => {
                const content = await import(file);
                const task = content.default as (options: TemplateOptions) => OutputFileTask;
                return task?.(options) ?? {};
            }),
        );
    }
}
