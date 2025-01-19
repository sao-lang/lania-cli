import ViteCompiler from '@lib/compilers/vite.compiler';
import WebpackCompiler from '@lib/compilers/webpack.compiler';
import logger from '@utils/logger';
import getPort from 'get-port';
import { getLanConfig } from './command.util';
import webpack from 'webpack';
import { LaniaCommand } from './command.base';
import { DevActionOptions, LaniaCommandActionInterface } from '@lania-cli/types';

const { DefinePlugin } = webpack;
class DevAction implements LaniaCommandActionInterface<[DevActionOptions]> {
    public async handle(options: DevActionOptions) {
        const {
            path: lanConfigPath,
            port,
            hmr,
            host,
            open,
            config: configPath,
            mode = 'development',
        } = options;
        const availablePort = await getPort({ port: Number(port) });
        const { buildTool } = await getLanConfig(lanConfigPath);
        switch (buildTool) {
            case 'vite': {
                const compiler = new ViteCompiler(configPath);
                process.env.NODE_ENV = mode;
                await compiler.createServer({
                    server: { port: availablePort, hmr, open, host },
                    mode,
                    define: {
                        'import.meta.env.VITE_NODE_ENV': JSON.stringify(mode || 'development'),
                    },
                });
                break;
            }
            case 'webpack': {
                const compiler = new WebpackCompiler(configPath);
                const devServer = { port: availablePort, hot: hmr, open, host };
                process.env.NODE_ENV = mode;
                await compiler.createServer({
                    devServer,
                    plugins: [
                        new DefinePlugin({
                            'process.env.NODE_ENV': JSON.stringify(mode || 'development'),
                        }),
                    ],
                });
                break;
            }
            case 'rollup':
            case 'tsc': {
                logger.error('The current packaging tool does not support the dev command!');
                process.exit(1);
                break;
            }
            default: {
                throw new Error('Unknown build tool!');
            }
        }
    }
}

export default class DevCommand extends LaniaCommand<[DevActionOptions]> {
    protected actor = new DevAction();
    protected commandNeededArgs = {
        name: 'dev',
        description: 'Start a development server for the application.',
        options: [
            {
                flags: '-p, --port [port]',
                description: 'Port to the development server.',
                defaultValue: '8089',
            },
            { flags: '-c, --config [config]', description: 'Path to configuration file.' },
            {
                flags: '-h, --hmr',
                description: 'Whether to turn on HMR or not.',
                defaultValue: true,
            },
            {
                flags: '--host',
                description: 'Host to the development server',
                defaultValue: '127.0.0.1',
            },
            { flags: '-p, --path [path]', description: 'Path to lan configuration file.' },
            { flags: '--mode', description: 'Mode of initiating the project.' },
            {
                flags: '-o, --open',
                description:
                    'Automatically open projects in the browser after starting the server.',
                defaultValue: true,
            },
        ],
        alias: '-d',
    };
}
