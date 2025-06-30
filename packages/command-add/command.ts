import {
    ADD_COMMAND_SUPPORT_TEMPLATES,
    LaniaCommand,
    LaniaCommandConfig,
    fileExists,
    getLanConfig,
    mkDirs,
    simplePromptInteraction,
} from '@lania-cli/common';
import { isUnixAbsoluteDirPath, isUnixAbsoluteFilePath } from '@lania-cli/common';
import { defineEnumMap } from '@lania-cli/common';
import { AddCommandOptions, LangEnum, LaniaCommandActionInterface } from '@lania-cli/types';
import { writeFile } from 'fs/promises';
class AddAction implements LaniaCommandActionInterface<[AddCommandOptions]> {
    private templatesSet = defineEnumMap(ADD_COMMAND_SUPPORT_TEMPLATES);
    async handle({ template, filepath, name }: AddCommandOptions = {}) {
        const tmp = await this.getPromptTemplate(template);
        const path = await this.getPromptFilepath(filepath);
        await this.generateFiles(path, tmp, name);
    }
    private async getPromptTemplate(template?: string) {
        if (template) {
            if (!ADD_COMMAND_SUPPORT_TEMPLATES[template]) {
                throw new Error('Invalid template!');
            }
            return template;
        }
        const { template: promptTemplate } = await simplePromptInteraction({
            type: 'list',
            name: 'template',
            message: 'Please select the template:',
            choices: this.templatesSet.getOptionList({ labelKey: 'name' }) as {
                name: string;
                value: string;
            }[],
        });
        if (!promptTemplate) {
            throw new Error('Please select a template!');
        }
        return promptTemplate;
    }
    private async getPromptFilepath(filepath: string) {
        filepath =
            filepath ||
            (
                await simplePromptInteraction({
                    type: 'input',
                    name: 'filepath',
                    message:
                        'Please enter the filepath(example: /src/pages or /src/pages/test/index.tsx):',
                })
            )?.filepath;
        if (!isUnixAbsoluteFilePath(filepath) && !isUnixAbsoluteDirPath(filepath)) {
            throw new Error(
                'Please enter a valid directory or file path, such as: /src/pages or /src/pages/test/index.tsx',
            );
        }
        return filepath;
    }
    private async generateFiles(filepath: string, template: string, name: string = 'index') {
        const { language = LangEnum.TypeScript } = await getLanConfig();
        const content = '112';
        const extname = this.getFileExtname(template, language);
        const fullPath = `${process.cwd()}${filepath}/${name}${extname}`;
        if (await fileExists(fullPath)) {
            throw new Error('File already exists!');
        }
        await mkDirs(`${process.cwd()}${filepath}`);
        await writeFile(fullPath, content, 'utf-8');
    }
    private getFileExtname(template: string = this.templatesSet.rcc.value, language: LangEnum) {
        const { extname } = (this.templatesSet[template] ?? {}) as {
            extname?: string | Record<LangEnum, string>;
        };
        if (typeof extname === 'object') {
            return `.${extname[language]}`;
        }
        return `${extname ? `.${extname}` : ''}`;
    }
}

@LaniaCommandConfig(new AddAction(), {
    name: 'add',
    description: 'Add files for current application.',
    options: [
        {
            flags: '-p, --filepath [directory]',
            description: 'The filepath you will add.',
        },
        {
            flags: '-t, --template [template]',
            description: 'The template of the file you will add.',
        },
        {
            flags: '-n, --name [name]',
            description: 'The name of the file you will add.',
        },
    ],
    alias: '-a',
})
export class AddCommand extends LaniaCommand<[AddCommandOptions]> {}

export default AddCommand;
