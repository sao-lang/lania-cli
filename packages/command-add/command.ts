import { ADD_COMMAND_SUPPORT_TEMPLATES, LaniaCommand } from '@lania-cli/common';

class AddAction implements LaniaCommandActionInterface<[AddCommandOptions]> {
    async handle({ filepath, template }: AddCommandOptions = {}) {
        filepath = filepath || process.cwd();
        template =
            template ||
            (ADD_COMMAND_SUPPORT_TEMPLATES.rfc as keyof typeof ADD_COMMAND_SUPPORT_TEMPLATES);
        if (!ADD_COMMAND_SUPPORT_TEMPLATES[template]) {
            throw new Error('Invalid template!');
        }
    }
}
import { AddCommandOptions, LaniaCommandActionInterface } from '@lania-cli/types';

export class AddCommand extends LaniaCommand<[AddCommandOptions]> {
    protected actor = new AddAction();
    protected commandNeededArgs = {
        name: 'add',
        description: 'Add files for current application.',
        options: [
            {
                flags: '-p, --filepath [directory]',
                description: 'The filepath you will add.',
            },
            {
                flags: '-t, --template',
                description: 'The template of the file you will add.',
                defaultValue: false,
            },
        ],
        alias: '-a',
    };
}

export default AddCommand;