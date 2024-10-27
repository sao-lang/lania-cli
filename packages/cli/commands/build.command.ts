import ViteCompiler from '@lib/compilers/vite.compiler';
import WebpackCompiler from '@lib/compilers/webpack.compiler';
import logger from '@utils/logger';
import to from '@utils/to';
import { Command } from 'commander';
import { getLanConfig } from './command.util';
import TscCompiler from '@lib/compilers/tsc.compiler';
import RollupCompiler from '@lib/compilers/rollup.compiler';
import webpack from 'webpack';

const { DefinePlugin } = webpack;
class BuildAction {
    public async handle(watch: boolean, configPath: string, lanConfigPath: string) {
        const { buildTool } = await getLanConfig(lanConfigPath);
        switch (buildTool) {
            case 'vite': {
                const compiler = new ViteCompiler({ configPath });
                await compiler.build({
                    build: { watch: watch ? {} : null },
                    define: {
                        import: {
                            meta: {
                                env: {
                                    NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
                                },
                            },
                        },
                    },
                });
                break;
            }
            case 'webpack': {
                const compiler = new WebpackCompiler({ configPath });
                await compiler.build({
                    watch,
                    mode: 'production',
                    plugins: [
                        new DefinePlugin({
                            process: {
                                env: {
                                    NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
                                },
                            },
                        }),
                    ],
                });
                break;
            }
            case 'tsc': {
                const compiler = new TscCompiler({ configPath });
                compiler.build({ watch });
                break;
            }
            case 'rollup': {
                const compiler = new RollupCompiler({ configPath });
                await compiler.build({ watch: watch ? {} : null });
                break;
            }
            default: {
                throw new Error('Unknown build tool!');
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
