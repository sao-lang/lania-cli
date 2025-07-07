import { readdir } from 'fs/promises';
import { SpaReactTemplate } from './spa-react';
import { statSync } from 'fs';
import { resolve } from 'path';
import { CreateCommandOptions, OutputFileTask, InteractionConfig } from '@lania-cli/types';
import { PromptModule } from 'inquirer';
export class TemplateFactory {
    public static create(name: string) {
        const templateMap = {
            [SpaReactTemplate.__name]: SpaReactTemplate,
        };
        for (const key in templateMap) {
            if (name && name === key) {
                return new templateMap[key]();
            }
        }
        throw new Error(`Invalid template: ${name}!`);
    }
    public static async list() {
        try {
            const dirPath = resolve(__dirname, '../src');
            const targets = await readdir(dirPath);
            return targets.filter((f) => {
                if (!statSync(`${dirPath}/${f}`).isDirectory()) {
                    return false;
                }
                return true;
            });
        } catch (e) {
            throw e as Error;
        }
    }
}

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
            const basename = pathSplitted?.[pathSplitted.length] ?? '' + '.ejs';
            return {
                hide,
                outputPath,
                filepath: `${__dirname}/templates/${basename}`,
            };
        });
    }
}

export * from './spa-react';
