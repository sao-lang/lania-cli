import ViteCompiler from '@lib/compilers/vite.compiler';
import logger from '@utils/logger';
import to from '@utils/to';
import { Command } from 'commander';

class BuildAction {
    public async handle(name: string) {
        const compiler = new ViteCompiler();
        compiler.build();
    }
}

export default class BuildCommand {
    public load(program: Command) {
        program
            .command('build')
            .description('Build the application.')
            .option('-c, --config [path]', 'Path to configuration file.')
            .option('-t, --tsconfig [path]', 'Path to tsconfig file.')
            .option('-w, --watch', 'Run in watch mode (live-reload).')
            .alias('-b')
            .action(async (name) => {
                const [handleErr] = await to(new BuildAction().handle(name));
                if (handleErr) {
                    logger.error(handleErr.message, true);
                }
            });
    }
}
