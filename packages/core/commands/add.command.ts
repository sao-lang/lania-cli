import { ADD_SUPPORT_TEMPLATES } from '@lania-cli/common';
import { LaniaCommand, LaniaCommandActionInterface } from './command.base';

interface AddCommandOptions {
    filepath?: string;
    template?: keyof typeof ADD_SUPPORT_TEMPLATES;
}

class AddAction implements LaniaCommandActionInterface<[AddCommandOptions]> {
    async handle({ filepath, template }: AddCommandOptions = {}) {
        filepath = filepath || process.cwd();
        template = template || (ADD_SUPPORT_TEMPLATES.rfc as keyof typeof ADD_SUPPORT_TEMPLATES);
        if (!ADD_SUPPORT_TEMPLATES[template]) {
            throw new Error('Invalid template!');
        }
    }
}

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
