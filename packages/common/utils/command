import { CommandNeededArgsInterface, LaniaCommandActionInterface } from '@lania-cli/types';
import { logger } from './logger';
import { Command } from 'commander';

export const registerCommands = async (
    name: string,
    version: string,
    commands?: LaniaCommand[],
) => {
    try {
        const program = new Command();
        program
            .name(name)
            .version(version, '-v, --version', 'Output the current version.')
            .helpOption('-h, --help')
            .usage('<command> [option]');
        commands?.forEach((command) => {
            program.addCommand(command.load());
        });
        program.parse(process.argv);
    } catch (e) {
        logger.error(e);
        process.exit(0);
    }
};

export abstract class LaniaCommand<ActionArgs extends any[] = any[]> {
    protected abstract actor: LaniaCommandActionInterface<ActionArgs>;
    protected abstract commandNeededArgs: CommandNeededArgsInterface;
    protected subcommands?: LaniaCommand[];
    protected program: Command;
    constructor() {
        this.load();
    }
    public load() {
        const { name, description, options, alias } = this.commandNeededArgs ?? {};
        let program = new Command(name);
        description && (program = program.description(description));
        options?.forEach(({ flags, defaultValue, description }) => {
            program = program.option(flags, description, defaultValue);
        });
        alias && (program = program.alias(alias));
        program = program.action(async (...args: ActionArgs) => {
            try {
                await this.actor.handle(...args);
            } catch (e) {
                logger.error(e.message);
                process.exit(0);
            }
        });
        this.subcommands?.forEach((subcommand) => {
            program.addCommand(subcommand.load());
        });
        return program;
    }
}
