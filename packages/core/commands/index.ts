import CommandLoader from './command.loader';
import { Command } from 'commander';
import pkgJsonContent from '../package.json';
import logger from '@utils/logger';

const bootstrap = async () => {
    try {
        const program = new Command();
        program
            .name(pkgJsonContent.name)
            .version(pkgJsonContent.version, '-v, --version', 'Output the current version.')
            .helpOption('-h, --help')
            .usage('<command> [option]');
        CommandLoader.load(program);
        program.parse(process.argv);
    } catch (e) {
        logger.error(e, true);
    }
};
bootstrap();
// import pkgJsonContent from '../package.json';
// import { SyncCommand } from '@lania-cli/command-sync';
// import { DevCommand } from '@lania-cli/command-dev';
// import { BuildCommand } from '@lania-cli/command-build';
// import { LintCommand } from '@lania-cli/command-lint';
// import { CreateCommand } from '@lania-cli/command-create';
// import { SyncCommand } from '@lania-cli/command-sync';
// import { SyncCommand } from '@lania-cli/command-sync';
// import { registerCommands } from '@lania-cli/common';
