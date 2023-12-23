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
}

export interface Template {
    getDependenciesArray(options: TemplateOptions): string[];
    // getOutputFileTasks(options: TemplateOptions): {}[];
}

class TemplateFactory {
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

export { SpaReactTemplate, TemplateFactory };