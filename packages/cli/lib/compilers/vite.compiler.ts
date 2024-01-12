import {
    type InlineConfig,
    build as viteBuild,
    createServer as viteCreateServer,
    type ViteDevServer,
    createLogger,
} from 'vite';
import Compiler, { type BaseCompilerInterface } from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';
import logger from '@utils/logger';

export default class ViteCompiler extends Compiler<InlineConfig> {
    constructor(
        configOption?: {
            module?: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
            configPath?: string;
        },
        config?: InlineConfig,
    ) {
        let server: ViteDevServer | null;
        const customLogger = createLogger();
        customLogger.error = (message) => {
            logger.bold(message);
        };
        customLogger.warn = (message) => {
            logger.warning(message);
        };
        // const baseConfig = { customLogger, logLevel: 'silent' } as InlineConfig;
        const baseCompiler: BaseCompilerInterface<InlineConfig> = {
            build: async (config: InlineConfig = {}) => {
                const output = await viteBuild({ ...config });
                return output;
            },
            async createServer(this: typeof baseCompiler, config: InlineConfig = {}) {
                await this.closeServer();
                server = await viteCreateServer({ ...config });
                await server.listen();
                server.printUrls();
            },
            closeServer: async () => {
                if (server) {
                    await await server.close();
                }
            },
        };
        const { module, configPath } = configOption || {};
        super(
            baseCompiler,
            !module ? { module: 'vite', configPath } : { module, configPath },
            config,
        );
    }
}
