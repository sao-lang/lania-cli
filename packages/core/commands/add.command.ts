import { ADD_COMMAND_SUPPORT_TEMPLATES } from '@lania-cli/common';
import { LaniaCommand } from './command.base';

class AddAction implements LaniaCommandActionInterface<[AddCommandOptions]> {
    async handle({ filepath, template }: AddCommandOptions = {}) {
        filepath = filepath || __cwd;
        template =
            template ||
            (ADD_COMMAND_SUPPORT_TEMPLATES.rfc as keyof typeof ADD_COMMAND_SUPPORT_TEMPLATES);
        if (!ADD_COMMAND_SUPPORT_TEMPLATES[template]) {
            throw new Error('Invalid template!');
        }
    }
}
import { AddCommandOptions, LaniaCommandActionInterface } from '@lania-cli/types';

export default class AddCommand extends LaniaCommand<[AddCommandOptions]> {
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
