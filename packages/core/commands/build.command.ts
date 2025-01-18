import ViteCompiler from '@lib/compilers/vite.compiler';
import WebpackCompiler from '@lib/compilers/webpack.compiler';
import { getLanConfig } from './command.util';
// import TscCompiler from '@lib/compilers/tsc.compiler';
import { RollupCompiler } from '@lib/compilers/rollup.compiler';
import webpack, { Configuration } from 'webpack';
import { LaniaCommand, LaniaCommandActionInterface } from './command.base';

interface BuildActionOptions {
    watch?: boolean;
    config?: string;
    path?: string;
    mode?: string;
}

const { DefinePlugin } = webpack;
class BuildAction implements LaniaCommandActionInterface<[BuildActionOptions]> {
    public async handle(options: BuildActionOptions) {
        const { watch, config: configPath, path: lanConfigPath, mode } = options;
        const { buildTool } = await getLanConfig(lanConfigPath);
        switch (buildTool) {
            case 'vite': {
                const compiler = new ViteCompiler(configPath);
                process.env.NODE_ENV = mode;
                await compiler.build({
                    build: { watch: watch ? {} : null },
                    define: {
                        'import.meta.env.VITE_NODE_ENV': JSON.stringify(mode || 'development'),
                    },
                    mode,
                });
                break;
            }
            case 'webpack': {
                const compiler = new WebpackCompiler(configPath);
                process.env.NODE_ENV = mode;
                const pluginOptions: Configuration = {
                    watch,
                    plugins: [
                        new DefinePlugin({
                            'process.env.NODE_ENV': JSON.stringify(mode || 'development'),
                        }),
                    ],
                };
                if (['development', 'production'].includes(mode)) {
                    pluginOptions.mode = mode as 'development' | 'production';
                }
                await compiler.build(pluginOptions);
                break;
            }
            // case 'tsc': {
            //     const compiler = new TscCompiler({ configPath });
            //     compiler.build({ watch });
            //     break;
            // }
            case 'rollup': {
                const compiler = new RollupCompiler(configPath);
                await compiler.build({ watch: watch ? {} : null });
                break;
            }
            default: {
                throw new Error('Unknown build tool!');
            }
        }
    }
}

export default class BuildCommand extends LaniaCommand<[BuildActionOptions]> {
    protected actor = new BuildAction();
    protected commandNeededArgs = {
        name: 'build',
        description: 'Build the application.',
        options: [
            { flags: '-c, --config [config]', description: 'Path to configuration file.' },
            { flags: '-p, --path [path]', description: 'Path to lan configuration file.' },
            { flags: '-w, --watch', description: 'Run in watch mode.', defaultValue: false },
            {
                flags: '-m, --mode [mode]',
                description:
                    'Specify whether the running mode of the server is production or development.',
                defaultValue: 'development',
            },
            { flags: '--mode', description: 'Mode of initiating the project.' },
        ],
        alias: '-b',
    };
}
