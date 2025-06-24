import {
    ADD_COMMAND_SUPPORT_TEMPLATES,
    LaniaCommand,
    LaniaCommandConfig,
    simplePromptInteraction,
} from '@lania-cli/common';
import { defineEnumMap } from '@lania-cli/common';

class AddAction implements LaniaCommandActionInterface<[AddCommandOptions]> {
    private templatesSet = defineEnumMap(ADD_COMMAND_SUPPORT_TEMPLATES);
    async handle({ template, filepath }: AddCommandOptions = {}) {
        // filepath = filepath || process.cwd();
        // template =
        //     template ||
        //     (ADD_COMMAND_SUPPORT_TEMPLATES.rfc as keyof typeof ADD_COMMAND_SUPPORT_TEMPLATES);
        // if (!ADD_COMMAND_SUPPORT_TEMPLATES[template]) {
        //     throw new Error('Invalid template!');
        // }
        // console.log({ options });
        const finalTemp = await this.getPromptTemplate(template);
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
}
import { AddCommandOptions, LaniaCommandActionInterface } from '@lania-cli/types';

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
