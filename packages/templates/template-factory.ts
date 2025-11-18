import { readdir } from 'fs/promises';
import { SpaReactTemplate } from './spa-react';
import { SpaVueTemplate } from './spa-vue';
import { statSync } from 'fs';
export class TemplateFactory {
    public static create(name: string) {
        const templateMap = {
            [SpaReactTemplate.__name]: SpaReactTemplate,
            [SpaVueTemplate.__name]: SpaVueTemplate
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
            const targets = await readdir(__dirname);
            return targets
                .filter((f) => {
                    if (!statSync(`${__dirname}/${f}`).isDirectory() || !f.includes('__lania')) {
                        return false;
                    }
                    return true;
                })
                .map((f) => f.replace('__lania-', ''));
        } catch (e) {
            throw e as Error;
        }
    }
}
