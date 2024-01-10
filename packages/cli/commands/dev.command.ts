import ViteCompiler from '@lib/compilers/vite.compiler';
import logger from '@utils/logger';
import to from '@utils/to';
import { Command } from 'commander';
import getPort from 'get-port';

class DevAction {
    public async handle(port: number, config: string, hmr: boolean, open: boolean, host: string) {
        const compiler = new ViteCompiler({ configPath: config });
        await compiler.createServer({ server: { port: Number(port), hmr, open, host } });
    }
}

export default class DevCommand {
    public load(program: Command) {
        program
            .command('dev')
            .description('Start a development server for the application.')
            .option('-p, --port [port]', 'Port to the development server.', '8089')
            .option('-c, --config [config]', 'Path to configuration file.')
            .option('-h, --hmr', 'Whether to turn on HMR or not.', true)
            .option('--host', 'Host to the development server', '127.0.0.1')
            .option(
                '-o, --open',
                'Automatically open projects in the browser after starting the server.',
                true,
            )
            .alias('-d')
            .action(async ({ port, config, hmr, open, host }) => {
                const [getPortErr, availablePort] = await to(getPort({ port: Number(port) }));
                if (getPortErr) {
                    logger.error(getPortErr.message);
                }
                const [handleErr] = await to(
                    new DevAction().handle(availablePort, config, hmr, open, host),
                );
                if (handleErr) {
                    logger.error(handleErr.message);
                }
            });
    }
}
