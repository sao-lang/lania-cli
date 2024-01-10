import Compiler, { type BaseCompilerInterface } from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';
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
            build: async (config: Configuration = {}) => {
                const compiler = webpack(config);
                compiler.run((err, stats) => {
                    console.log(stats.toJson().errors);
                });
            },
            async createServer(this: typeof baseCompiler, config: Configuration = {}) {
                await this.closeServer();
            },
            closeServer: async () => {},
        };
        const { module, configPath } = configOption || {};
        super(
            baseCompiler,
            !module ? { module: 'webpack', configPath } : { module, configPath },
            config,
        );
    }
}
