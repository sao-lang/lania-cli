import { readdir } from 'fs/promises';
import { SpaReactTemplate } from './spa-react';
import { statSync } from 'fs';
import { resolve } from 'path';
import { BaseTemplate } from './template.base';
console.log({ __filename });
export class TemplateFactory {
    public static create(name: string) {
        const templateMap = {
            [SpaReactTemplate.templateName]: SpaReactTemplate,
        };
        for (const key in templateMap) {
            if (name && name === key && key !== BaseTemplate.templateName) {
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

export * from './spa-react';
export * from './template.base';

console.log(__dirname);
