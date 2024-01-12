import Compiler, { type BaseCompilerInterface } from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';
import logger from '@utils/logger';
import text from '@utils/text';
import path from 'path';
import webpack, { type Configuration } from 'webpack';
import DevServer from 'webpack-dev-server';

export default class WebpackCompiler extends Compiler<Configuration> {
    constructor(
        configOption?: {
            module?: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
            configPath?: string;
        },
        config?: Configuration,
    ) {
        let server: DevServer | null;
        const baseCompiler: BaseCompilerInterface = {
            build: (config: Configuration = {}) => {
                return new Promise((resolve) => {
                    webpack(config, (err, stats) => {
                        if (err) {
                            throw err;
                        }
                        const { errors, warnings, time, version, assets, outputPath } =
                            stats.toJson();
                        if (warnings) {
                            warnings.forEach((warning) => {
                                logger.warning(
                                    `${warning.moduleIdentifier} ${warning.loc}\n${warning.message}`,
                                );
                            });
                        }
                        if (errors) {
                            errors.forEach(({ moduleIdentifier, message }, index) => {
                                typeof moduleIdentifier === 'string' &&
                                    logger.bold(
                                        `file: ${text(moduleIdentifier?.replace(/\\/g, '/'), {
                                            color: '#28b8db',
                                        })}`,
                                    );
                                logger.error(`${message}`, index === errors.length - 1);
                            });
                        }
                        assets.forEach(({ name, size }) => {
                            const dirname = path.basename(outputPath);
                            logger.log(
                                `${text(`${dirname}/${name}`, { color: '#6a7c80' })}  ${text(
                                    `${(size / 1024).toFixed(2)}k`,
                                    { bold: true, color: '#7a7c80' },
                                )}`,
                            );
                        });
                        logger.log(
                            `${text(`webpack v${version}`, { color: '#1da8cd' })} ${text(
                                `build for ${config.mode || 'development'}`,
                                { color: '#21a579' },
                            )}`,
                        );
                        logger.log(`built in ${time / 1000}s`, { color: '#21a579' });
                        resolve(true);
                    });
                });
            },
            createServer(this: typeof baseCompiler, config: Configuration = {}) {
                this.closeServer();
                return new Promise((resolve) => {
                    const compiler = webpack(config);
                    const { devServer } = config;
                    server = new DevServer(devServer, compiler);
                    server.listen(devServer.port, devServer.host, (err) => {
                        if (err) {
                            logger.error(err.message, true);
                        }
                    });
                    resolve(true);
                });
            },
            closeServer: async () => {
                if (server) {
                    server.close();
                }
            },
        };
        const { module, configPath } = configOption || {};
        super(
            baseCompiler,
            !module ? { module: 'webpack', configPath } : { module, configPath },
            config,
        );
    }
}
