import ViteCompiler from '@lib/compilers/vite.compiler';
import WebpackCompiler from '@lib/compilers/webpack.compiler';
import { Command } from 'commander';
import { getLanConfig } from './command.util';
// import TscCompiler from '@lib/compilers/tsc.compiler';
import { RollupCompiler } from '@lib/compilers/rollup.compiler';
import webpack, { Configuration } from 'webpack';
import { LaniaCommand } from './command.base';

const { DefinePlugin } = webpack;
class BuildAction {
    public async handle(watch: boolean, configPath: string, lanConfigPath: string, mode: string) {
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

export default class BuildCommand extends LaniaCommand {
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
            .option('--mode', 'Mode of initiating the project.')
            .alias('-b')
            .action(async ({ watch, config, path, mode }) => {
                await new BuildAction().handle(watch, config, path, mode);
            });
    }
}
