import getPort from 'get-port';
import webpack from 'webpack';
import { ViteCompiler, WebpackCompiler } from '@lania-cli/compilers';
import { getLanConfig, LaniaCommand, LaniaCommandConfig } from '@lania-cli/common';
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
        const { buildTool, buildAdaptors } = await getLanConfig(undefined, lanConfigPath);
        const buildAdaptor = buildAdaptors?.[buildTool];
        switch (buildTool) {
            case 'vite': {
                const compiler = new ViteCompiler(configPath, { outerCompiler: buildAdaptor });
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
                const compiler = new WebpackCompiler(configPath, { outerCompiler: buildAdaptor });
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
                throw new Error('The current packaging tool does not support the dev command!');
            }
            default: {
                throw new Error('Unknown build tool!');
            }
        }
    }
}

@LaniaCommandConfig(new DevAction(), {
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
            flags: '--hmr',
            description: 'Whether to turn on HMR or not.',
            defaultValue: false,
        },
        {
            flags: '--host',
            description: 'Host to the development server',
            defaultValue: '127.0.0.1',
        },
        { flags: '--path [path]', description: 'Path to lan configuration file.' },
        {
            flags: '-m, --mode [mode]',
            description:
                'Specify whether the running mode of the server is production or development.',
            defaultValue: 'development',
        },
        {
            flags: '-o, --open',
            description: 'Automatically open projects in the browser after starting the server.',
            defaultValue: false,
        },
    ],
    alias: '-d',
})
export class DevCommand extends LaniaCommand<[DevActionOptions]> { }

export default DevCommand;
