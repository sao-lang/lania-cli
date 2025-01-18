import { OutputFileTask, TemplateOptions } from '.';
export interface TaskConfig {
    filePath: string;
    outputPath: string;
    hide?: boolean;
}

export abstract class BaseTemplate {
    static templateName: string = 'base-template';
    protected abstract options: TemplateOptions;
    protected abstract taskConfigs: TaskConfig[];
    abstract getDependenciesArray(options: TemplateOptions): {
        dependencies: string[];
        devDependencies: string[];
    };
    public async createOutputTasks() {
        const tasks = await Promise.all(
            this.taskConfigs.map(async ({ outputPath, filePath, hide }) => {
                const content = await import(filePath);
                return {
                    outputPath,
                    content,
                    hide,
                } as OutputFileTask;
            }),
        );
        return tasks;
    }
}
