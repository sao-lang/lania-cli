import { LaniaCommand, LaniaCommandConfig } from '@lania-cli/common';
import { AddCommandOptions, LaniaCommandActionInterface } from '@lania-cli/types';

class ReleaseAction implements LaniaCommandActionInterface<[AddCommandOptions]> {
    async handle({ filepath, template }: AddCommandOptions = {}) {}
}

@LaniaCommandConfig(new ReleaseAction(), {
    name: 'release',
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
})
export class ReleaseCommand extends LaniaCommand<[AddCommandOptions]> {}

export default ReleaseCommand;
