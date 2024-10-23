import ViteCompiler from '@lib/compilers/vite.compiler';
import WebpackCompiler from '@lib/compilers/webpack.compiler';
import logger from '@utils/logger';
import to from '@utils/to';
import { Command } from 'commander';
import getPort from 'get-port';
import { getLanConfig } from './command.util';

class DevAction {
    public async handle(
        port: number,
        configPath: string,
        hmr: boolean,
        open: boolean,
        host: string,
        lanConfigPath: string,
    ) {
        const { buildTool } = await getLanConfig(lanConfigPath);
        switch (buildTool) {
            case 'vite': {
                const compiler = new ViteCompiler({ configPath });
                await compiler.createServer({ server: { port: Number(port), hmr, open, host } });
                break;
            }
            case 'webpack': {
                const compiler = new WebpackCompiler({ configPath });
                const devServer = { port: Number(port), hot: hmr, open, host };
                await compiler.createServer({ devServer });
                break;
            }
            case 'rollup':
            case 'tsc': {
                logger.warning('The current packaging tool does not support the dev command!');
                process.exit(1);
                break;
            }
            default: {
                throw new Error('Unknown build tool!');
            }
        }
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
            .option('-p, --path [path]', 'Path to lan configuration file.')
            .option(
                '-o, --open',
                'Automatically open projects in the browser after starting the server.',
                true,
            )
            .alias('-d')
            .action(async ({ port, config, hmr, open, host, path }) => {
                const availablePort = await getPort({ port: Number(port) });
                const [handleErr] = await to(
                    new DevAction().handle(availablePort, config, hmr, open, host, path),
                );
                if (handleErr) {
                    logger.error(handleErr.message);
                }
            });
    }
}
