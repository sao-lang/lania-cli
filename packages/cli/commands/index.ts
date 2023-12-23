import CommandLoader from './command.loader';
// @ts-ignore
import { Command } from 'commander';
import pkgJsonContent from '../package.json';
import logger from '@utils/logger';
import ConfigurationLoader from '@lib/configuration/configuration.loader';
import to from '@utils/to';
import EsLinter from '@linters/eslint.linter';
import path from 'path';
import StyleLinter from '@linters/stylelint.linter';
import MarkdownLinter from '@linters/markdownlint.linter';

const bootstrap = async () => {
    // try {
    //     const program = new Command();
    //     program
    //         .name(pkgJsonContent.name)
    //         .version(pkgJsonContent.version, '-v, --version', 'Output the current version.')
    //         .helpOption('-h, --help')
    //         .usage('<command> [option]');
    //     CommandLoader.load(program);
    //     program.parse();
    // } catch (e) {
    //     logger.error(e.message, true);
    // }
    const [loadErr, config] = await to<Record<string, any>>(
        new ConfigurationLoader().load('markdownlint'),
    );
    console.log({ config });
    if (loadErr) {
        logger.error(loadErr.message, true);
    }
    const linter = new MarkdownLinter();
    const [lintErr, result] = await to(
        linter.checkFile(path.resolve(process.cwd(), './index.md'), config, true),
    );
    if (lintErr) {
        logger.error(lintErr.message as string, true);
    }
    console.log(result);
};
bootstrap();
