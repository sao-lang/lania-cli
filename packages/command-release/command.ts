import { LaniaCommand } from '@lania-cli/common';

class ReleaseAction implements LaniaCommandActionInterface<[AddCommandOptions]> {
    async handle({ filepath, template }: AddCommandOptions = {}) {}
}
import { AddCommandOptions, LaniaCommandActionInterface } from '@lania-cli/types';

export class ReleaseCommand extends LaniaCommand<[AddCommandOptions]> {
    protected actor = new ReleaseAction();
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

export default ReleaseCommand;
