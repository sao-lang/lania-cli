import ViteCompiler from '@lib/compilers/vite.compiler';
import WebpackCompiler from '@lib/compilers/webpack.compiler';
import logger from '@utils/logger';
import to from '@utils/to';
import { Command } from 'commander';
import path from 'path';
import { getLanConfig } from './command.util';
import TscCompiler from '@lib/compilers/tsc.compiler';

class BuildAction {
    public async handle(watch: boolean, configPath: string, lanConfigPath: string) {
        const { buildTool } = await getLanConfig(lanConfigPath);
        switch (buildTool) {
            case 'vite': {
                const compiler = new ViteCompiler({ configPath });
                await compiler.build({ build: { watch: watch ? {} : null } });
                break;
            }
            case 'webpack': {
                const compiler = new WebpackCompiler({ configPath });
                await compiler.build({ watch });
                break;
            }
            default: {
                const compiler = new TscCompiler();
                compiler.build();
                // throw new Error('Unknown build tool!');
            }
        }
    }
}

export default class BuildCommand {
    public load(program: Command) {
        program
            .command('build')
            .description('Build the application.')
            .option('-c, --config [config]', 'Path to configuration file.')
            .option('-p, --path [path]', 'Path to lan configuration file.')
            .option('-w, --watch', 'Run in watch mode.', false)
            .option(
                '-m, --mode [mode]',
                'Specify whether the running mode of the server is production or development.',
                'development',
            )
            .alias('-b')
            .action(async ({ watch, config, path }) => {
                const [handleErr] = await to(new BuildAction().handle(watch, config, path));
                if (handleErr) {
                    logger.error(handleErr.message, true);
                }
            });
    }
}
//.
