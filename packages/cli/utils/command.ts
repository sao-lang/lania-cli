import { Command } from 'commander';
// import { CommandKey } from './enums';

export type CliArguments = {
    value: string;
    description: string;
}[];

const program = new Command();

/**
 * 注册命令
 */
export const registerCommand = (
    command: string,
    args?: CliArguments,
    action?: (args: Record<string, string | boolean | number>) => void,
) => {
    const commander = program.command(command);
    args?.forEach(({ value, description }) => {
        commander.option(value, description);
    });

    commander.usage('[options]').action((options: Record<string, string>) => {
        action?.(options);
    });
};

export const startCommander = (
    register: () => void,
    { version, name }: { version: string; name: string },
) => {
    program.name(name).version(version).helpOption('-h, --help').usage('<command> [option]');
    register();
    program.parse();
};
