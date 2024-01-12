import Compiler, { type BaseCompilerInterface } from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';
import logger from '@utils/logger';
import ts from 'typescript';

const formatHost = {
    getCanonicalFileName: (path) => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
};

function watchMain() {
    const configPath = ts.findConfigFile(/*searchPath*/ './', ts.sys.fileExists, 'tsconfig.json');
    if (!configPath) {
        // eslint-disable-next-line quotes
        throw new Error("Could not find a valid 'tsconfig.json'.");
    }

    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

    const host = ts.createWatchCompilerHost(
        configPath,
        {},
        ts.sys,
        createProgram,
        reportDiagnostic,
        reportWatchStatusChanged,
    );

    const origCreateProgram = host.createProgram;
    host.createProgram = (rootNames, options, host, oldProgram) => {
        // eslint-disable-next-line quotes
        console.info("We're about to create the program!");
        return origCreateProgram(rootNames, options, host, oldProgram);
    };
    const origPostProgramCreate = host.afterProgramCreate;

    host.afterProgramCreate = (program) => {
        console.info('We finished making the program!');
        origPostProgramCreate(program);
    };

    ts.createWatchProgram(host);
}

function reportDiagnostic(diagnostic) {
    console.error(
        'Error',
        diagnostic.code,
        ':',
        ts.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine()),
    );
}

function reportWatchStatusChanged(diagnostic) {
    let message = ts.formatDiagnostic(diagnostic, formatHost);
    if (message.indexOf('TS6194') > 0) {
        message = message.replace(/message\sTS[0-9]{4}:(.+)(\s+)$/, '$1');
        // console.ready({ message, badge: true });
    }
}

export default class TscCompiler extends Compiler {
    constructor(
        configOption?: {
            module?: ConfigurationLoadType | { module: string; searchPlaces?: string[] };
            configPath?: string;
        },
        config?: any,
    ) {
        // let server: ViteDevServer | null;
        // const baseConfig = { customLogger, logLevel: 'silent' } as InlineConfig;
        const baseCompiler: BaseCompilerInterface = {
            build: async (config) => {
                // watchMain();
                const configPath = ts.findConfigFile(
                    /*searchPath*/ './',
                    ts.sys.fileExists,
                    'tsconfig.json',
                );
                const { compilerOptions } = ts.readConfigFile(configPath, ts.sys.readFile).config;
                const compilerHost = ts.createCompilerHost(compilerOptions);
                const program = ts.createProgram({
                    options: compilerOptions,
                    rootNames: [],
                    host: compilerHost,
                });
                program.emit(undefined, (a, b, c, d, e, f) => {
                    console.log({ a, b, c, d, e, f });
                });
            },
        };
        const { module, configPath } = configOption || {};
        super(
            baseCompiler,
            !module ? { module: 'tsc', configPath } : { module, configPath },
            config,
        );
    }
}
