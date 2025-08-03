import {
    ADD_COMMAND_SUPPORT_TEMPLATES,
    EjsRenderer,
    LaniaCommand,
    LaniaCommandConfig,
    ProgressGroup,
    ProgressStep,
    fileExists,
    getLanConfig,
    mkDirs,
    simplePromptInteraction,
} from '@lania-cli/common';
import { isUnixAbsoluteDirPath, isUnixAbsoluteFilePath } from '@lania-cli/common';
import { defineEnumMap } from '@lania-cli/common';
import {
    AddCommandOptions,
    LangEnum,
    LaniaCommandActionInterface,
    ScopedManager,
} from '@lania-cli/types';
import path from 'path';
import fs from 'fs';
@ProgressGroup('lania:add', { type: 'spinner' })
class AddAction implements LaniaCommandActionInterface<[AddCommandOptions]> {
    private __progressManager: ScopedManager;
    private templatesSet = defineEnumMap(ADD_COMMAND_SUPPORT_TEMPLATES);
    async handle({ template, filepath, name }: AddCommandOptions = {}) {
        const promptTemplate = await this.getPromptTemplate(template);
        const promptPath = await this.getPromptFilepath(filepath);
        await this.generateFiles(promptPath, promptTemplate, name);
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
        if (!filepath) {
            filepath = (
                await simplePromptInteraction({
                    type: 'input',
                    name: 'filepath',
                    message:
                        'Please enter the filepath(example: /src/pages or /src/pages/test/index.tsx):',
                })
            )?.filepath;
        }
        if (!isUnixAbsoluteFilePath(filepath) && !isUnixAbsoluteDirPath(filepath)) {
            throw new Error(
                'Please enter a valid directory or file path, such as: /src/pages or /src/pages/test/index.tsx',
            );
        }
        return filepath;
    }
    @ProgressStep('generate-file', { total: 1, manual: true })
    private async generateFiles(filepath: string, template: string, name: string = 'index') {
        const {
            language = LangEnum.TypeScript,
            cssProcessor = 'css',
            name: projectName,
        } = await getLanConfig();
        const extname = this.getFileExtname(template, language);
        const filename = this.getFilename(template, name);
        const fullPath = `${process.cwd()}${filepath}/${filename}${extname}`;
        if (await fileExists(fullPath)) {
            throw new Error('File already exists!');
        }
        this.__progressManager.init();
        await mkDirs(`${process.cwd()}${filepath}`);
        const files = fs
            .readdirSync(path.resolve(__dirname, './templates'))
            .filter((file) => file === `${template}.ejs`)
            .map((file) => path.resolve(__dirname, `./templates/${file}`));
        await new EjsRenderer().renderFromFile(
            files[0],
            {
                cssProcessor,
                language: language === LangEnum.JavaScript ? 'js' : 'ts',
                name: projectName,
            },
            fullPath,
        );
        this.__progressManager.complete();
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
    private getFilename(template: string = this.templatesSet.rcc.value, promptName = 'index') {
        const { filename } = (this.templatesSet[template] ?? {}) as {
            filename?: string;
        };
        return filename ?? promptName;
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
