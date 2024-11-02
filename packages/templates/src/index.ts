import { readdir } from 'fs/promises';
import { SpaReactTemplate } from './spa-react-template';
import { statSync } from 'fs';
import { resolve } from 'path';
import { __dirname } from './utils';

export interface TemplateOptions {
    name: string;
    buildTool: string;
    cssProcessor: string;
    packageTool: string;
    lintTools: string[];
    language: 'TypeScript' | 'JavaScript';
    port?: number;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    template?: string;
    [x: string]: any;
}

export interface OutputFileTask {
    outputPath: string;
    options: TemplateOptions;
    templatePath?: string;
    content?: string;
    hide?: boolean;
}

export interface Template {
    getDependenciesArray(options: TemplateOptions): {
        dependencies: string[];
        devDependencies: string[];
    };
    getOutputFileTasks(
        options: TemplateOptions,
    ): (() => OutputFileTask | Promise<OutputFileTask>)[];
}

export class TemplateFactory {

    public static create(name: string) {
        switch (name) {
            case 'spa-react-template':
                return new SpaReactTemplate();
            default:
                throw new Error(`Invalid template: ${name}!`);
        }
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
