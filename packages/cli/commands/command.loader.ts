import { type Command } from 'commander';
import CreateCommand from './create.command';
import logger from '@utils/logger';
import BuildCommand from './build.command';
import DevCommand from './dev.command';
import LintCommand from './lint.command';
import GSyncCommand from './gsync.command';
import AddCommand from './add.command';

export default class CommandLoader {
    public static load(program: Command) {
        new CreateCommand().load(program);
        new BuildCommand().load(program);
        new DevCommand().load(program);
        new LintCommand().load(program);
        new GSyncCommand().load(program);
        new AddCommand().load(program);
        this.handleInvalidCommand(program);
    }

    private static handleInvalidCommand(program: Command) {
        program.on('command:*', ([command]: string[]) => {
            logger.error(
                `Invalid command: ${command}. See --help for a list of available commands.`,
                true,
            );
        });
    }
}
