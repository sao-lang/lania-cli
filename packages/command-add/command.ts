import {
    ADD_COMMAND_SUPPORT_TEMPLATES,
    LaniaCommand,
    LaniaCommandConfig,
    getLanConfig,
    mkDirs,
    simplePromptInteraction,
} from '@lania-cli/common';
import {
    splitDirectoryAndFileName,
    isUnixAbsoluteDirPath,
    isUnixAbsoluteFilePath,
} from '@lania-cli/common';
import { defineEnumMap } from '@lania-cli/common';
import { AddCommandOptions, LangEnum, LaniaCommandActionInterface } from '@lania-cli/types';
import { writeFile } from 'fs/promises';
class AddAction implements LaniaCommandActionInterface<[AddCommandOptions]> {
    private templatesSet = defineEnumMap(ADD_COMMAND_SUPPORT_TEMPLATES);
    async handle({ template, filepath = process.cwd() }: AddCommandOptions = {}) {
        const tmp = await this.getPromptTemplate(template);
        const path = await this.getPromptFilepath(filepath);
        await this.generateFiles(path, tmp);
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
        if (!isUnixAbsoluteFilePath(filepath) || !isUnixAbsoluteDirPath(filepath)) {
            throw new Error(
                'Please enter a valid directory or file path, such as: /src/pages or /src/pages/test/index.tsx',
            );
        }
        return filepath;
    }
    private async generateFiles(filepath: string, template: string) {
        const { baseName, directoryPath } = splitDirectoryAndFileName(filepath);
        const { language = LangEnum.TypeScript } = await getLanConfig();
        const content = '112';
        await mkDirs(directoryPath);
        await writeFile(`${directoryPath}/${baseName}`, content, 'utf-8');
    }
    private getFileBasename() {}
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
    ],
    alias: '-a',
})
export class AddCommand extends LaniaCommand<[AddCommandOptions]> {}

export default AddCommand;
