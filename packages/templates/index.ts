import { readdir, readFile } from 'fs/promises';
import { statSync } from 'fs';
import path from 'path';
import type {
    CreateCommandOptions,
    OutputFileTask,
    InteractionConfig,
    DependencyAndVersion,
} from '@lania-cli/types';
import type { PromptModule } from 'inquirer';
import { safeJsonParse } from '@lania-cli/common';
import { pathToFileURL } from 'url';

interface TmpListRes {
    name: string;
    value: string;
}
export class TemplateFactory {
    static tempArray: (TmpListRes & { dir: string })[] = [];
    public static async create(name: string) {
        const list = await TemplateFactory.list();
        const tmp = list.find(({ value }) => value === name);
        if (!tmp) {
            throw new Error(`Invalid template: ${name}`);
        }
        const config = (await import(
            pathToFileURL(path.resolve(tmp.dir.replace('__lania-', ''), 'index.js')).href
        )).default;
        return new Template(config.config, config.dependencies, config.questions)
    }
    public static async list() {
        try {
            if (TemplateFactory.tempArray.length === 0) {
                TemplateFactory.tempArray = (
                    await Promise.all(
                        (await readdir(__dirname)).map(async (f) => {
                            const dir = path.resolve(__dirname, f);
                            const flag = !f.includes('__lania') || !statSync(dir).isDirectory();
                            if (flag) {
                                return false;
                            }
                            const content = await readFile(path.resolve(dir, 'name.json'), {
                                encoding: 'utf-8',
                            });
                            const parsed = safeJsonParse<TmpListRes>(content, {
                                fallback: {} as TmpListRes,
                            });
                            return { ...(parsed as { value: TmpListRes }).value, dir };
                        }),
                    )
                ).filter((content) => !!content) as (TmpListRes & { dir: string })[];
            }
            return TemplateFactory.tempArray;
        } catch (e) {
            throw e as Error;
        }
    }
}

export class Template {
    constructor(
        private config: ((options: InteractionConfig) => OutputFileTask)[],
        private dependencies: {
            dependencies: (options: InteractionConfig) => (string | DependencyAndVersion)[];
            devDependencies: (options: InteractionConfig) => (string | DependencyAndVersion)[];
        },
        private questions: ((options: CreateCommandOptions) => Parameters<PromptModule>[0])[],
    ) {
        this.config = config;
        this.dependencies = dependencies;
        this.questions = questions;
        console.log({config: this.config, dependencies: this.dependencies, questions: this.questions})
    }
    public createPromptQuestions(options: CreateCommandOptions) {
        return this.questions.map((question) => question(options));
    }
    public getDependenciesArray(options: InteractionConfig) {
        return {
            dependencies: this.dependencies.dependencies(options),
            devDependencies: this.dependencies.devDependencies(options),
        };
    }
    public createOutputTasks(options: InteractionConfig) {
        return this.config.map((taskFn) => {
            const { outputPath = '', hide } = taskFn(options);
            const pathSplitted = outputPath.split('/');
            const basename = (pathSplitted?.[pathSplitted.length - 1] ?? '') + '.ejs';
            return {
                hide,
                outputPath,
                filepath: `${__dirname}/__lania-${options.projectType}/${basename}`,
            };
        });
    }
}
