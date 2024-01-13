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
        program.parse();
    } catch (e) {
        logger.error(e.message, true);
    }
};
bootstrap();
