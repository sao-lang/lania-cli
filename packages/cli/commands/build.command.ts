import ViteCompiler from '@lib/compilers/vite.compiler';
import WebpackCompiler from '@lib/compilers/webpack.compiler';
import logger from '@utils/logger';
import to from '@utils/to';
import { Command } from 'commander';
import webpack from 'webpack';
import { cosmiconfig } from 'cosmiconfig';
import ConfigurationLoader from '@lib/configuration/configuration.loader';
import deepmerge from 'deepmerge';
// import path, { dirname } from 'path';
// import MiniCssExtractPlugin from 'mini-css-extract-plugin';
// import HtmlWebpackPlugin from 'html-webpack-plugin';
// import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
// import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';

class BuildAction {
    public async handle(watch: boolean, configPath: string) {
        const compiler = new ViteCompiler({ configPath });
        await compiler.build({ build: { watch: watch ? {} : null } });

        // const compiler = new WebpackCompiler({ configPath });
        // await compiler.build();
    }
}

export default class BuildCommand {
    public load(program: Command) {
        program
            .command('build')
            .description('Build the application.')
            .option('-c, --config [path]', 'Path to configuration file.')
            .option('-w, --watch', 'Run in watch mode (live-reload).', false)
            .option(
                '-m, --mode',
                'Specify whether the running mode of the server is production or development.',
                'development',
            )
            .alias('-b')
            .action(async ({ watch, config, mode }) => {
                const [handleErr] = await to(new BuildAction().handle(watch, config));
                if (handleErr) {
                    logger.error(handleErr.message, true);
                }
            });
    }
}
//.
