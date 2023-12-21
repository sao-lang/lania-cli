import CommandLoader from './command.loader';
// @ts-ignore
import { Command } from 'commander';
import pkgJsonContent from '../package.json';

const bootstrap = () => {
    const program = new Command();
    program
        .name(pkgJsonContent.name)
        .version(pkgJsonContent.version, '-v, --version', 'Output the current version.')
        .helpOption('-h, --help')
        .usage('<command> [option]');

    CommandLoader.load(program);
    program.parse();
};
bootstrap();
