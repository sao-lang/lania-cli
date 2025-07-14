import { readdir } from 'fs/promises';
import { SpaReactTemplate } from './spa-react';
import { statSync } from 'fs';
import { resolve } from 'path';
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
