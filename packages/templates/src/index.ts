import { readdir } from 'fs/promises';
import { SpaReactTemplate } from './spa-react';
import { statSync } from 'fs';
import { resolve } from 'path';
import { BaseTemplate } from './template.base';
import { TemplateOptions } from '@lania-cli/types';



export class TemplateFactory {
    public static create(name: string, options: TemplateOptions) {
        const templateMap = {
            [SpaReactTemplate.templateName]: SpaReactTemplate,
        };
        for (const key in templateMap) {
            if (name && name === key && key !== BaseTemplate.templateName) {
                return new templateMap[key](options);
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
