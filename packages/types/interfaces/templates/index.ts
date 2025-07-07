import { InteractionConfig } from '../shared';

export interface OutputFileTask {
    outputPath: string;
    options?: InteractionConfig;
    templatePath?: string;
    content?: string;
    hide?: boolean;
}

export interface Template {
    getDependenciesArray(): {
        dependencies: string[];
        devDependencies: string[];
    };
    getOutputFileTasks(): Promise<{
        tasks: OutputFileTask[];
    }>;
}

export interface TaskConfig {
    filePath: string;
    outputPath: string;
    hide?: boolean;
}
