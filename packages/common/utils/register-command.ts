import { LaniaCommand, logger } from '../lib';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
// 注册入口函数，注册所有命令
export const registerCommands = async (
    name: string,
    version: string,
    commands?: LaniaCommand[],
) => {
    try {
        let cli = yargs(hideBin(process.argv))
            .scriptName(name)
            .version('version', version, '显示版本')
            .usage('<command> [options]')
            .help('help', '显示帮助信息')
            .alias('h', 'help')
            .alias('v', 'version')
            .showHelpOnFail(false);

        commands?.forEach((command) => {
            cli = cli.command(command.load());
        });

        await cli.parseAsync();
    } catch (e) {
        logger.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
    }
};
