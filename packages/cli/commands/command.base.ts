import logger from '@utils/logger';
import { Command } from 'commander';

export interface LaniaCommandActionInterface<Args extends any[] = any[]> {
    handle(...args: Args): Promise<void>;
}

export interface CommandNeededArgsInterface {
    name: string;
    description?: string;
    options: { flags: string; description?: string; defaultValue?: string | boolean | string[] }[];
    alias?: string;
}

export abstract class LaniaCommand<ActionArgs extends any[] = any[]> {
    protected abstract actor: LaniaCommandActionInterface<ActionArgs>;
    protected abstract commandNeededArgs: CommandNeededArgsInterface;
    public load(program: Command) {
        const { name, description, options, alias } = this.commandNeededArgs;
        program = program.command(name);
        description && (program = program.description(description));
        options?.forEach(({ flags, defaultValue, description }) => {
            program = program.option(flags, description, defaultValue);
        });
        alias && (program = program.alias(alias));
        program = program.action(async (...args: ActionArgs) => {
            try {
                await this.actor.handle(...args);
            } catch (e) {
                logger.error(e.message, true);
            }
        });
        return program;
    }
}
