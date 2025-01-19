import path from 'path';
import fs from 'fs';
import { OutputFileTask, TaskConfig, TemplateOptions } from '@lania-cli/types';

export abstract class BaseTemplate {
    static templateName: string = 'base-template';
    protected abstract templateFilesDirName: string;
    protected abstract options: TemplateOptions;
    protected abstract taskConfigs: TaskConfig[];
    abstract getDependenciesArray(options: TemplateOptions): {
        dependencies: string[];
        devDependencies: string[];
    };
    public async createOutputTasks() {
        const files = fs
            .readdirSync(path.resolve(this.templateFilesDirName, './templates'))
            .filter((file) => path.extname(file) === '.js')
            .map((file) => path.resolve(this.templateFilesDirName, `./templates/${file}`));
        return await Promise.all(
            files.map(async (file) => {
                const content = await import(file);
                const task = content.default as (options: TemplateOptions) => OutputFileTask;
                return task?.(this.options) ?? {};
            }),
        );
    }
}
