import Compiler, { type BaseCompilerInterface } from './compiler.base';
import { type ConfigurationLoadType } from '@lib/configuration/configuration.loader';
import logger from '@utils/logger';
import tsc from 'typescript';

// const formatHost = {
//     getCanonicalFileName: (path) => path,
//     getCurrentDirectory: tsc.sys.getCurrentDirectory,
//     getNewLine: () => tsc.sys.newLine,
// };

// function watchMain() {
//     const configPath = tsc.findConfigFile(/*searchPath*/ './', tsc.sys.fileExists, 'tsconfig.json');
//     if (!configPath) {
//         // eslint-disable-next-line quotes
//         throw new Error("Could not find a valid 'tsconfig.json'.");
//     }

//     const createProgram = tsc.createSemanticDiagnosticsBuilderProgram;

//     const host = tsc.createWatchCompilerHost(
//         configPath,
//         {},
//         tsc.sys,
//         createProgram,
//         reportDiagnostic,
//         reportWatchStatusChanged,
//     );

//     const origCreateProgram = host.createProgram;
//     host.createProgram = (rootNames, options, host, oldProgram) => {
//         // eslint-disable-next-line quotes
//         // console.info("We're about to create the program!");
//         return origCreateProgram(rootNames, options, host, oldProgram);
//     };
//     const origPostProgramCreate = host.afterProgramCreate;

//     host.afterProgramCreate = (program) => {
//         // console.info('We finished making the program!');
//         program.emit(undefined, (name, data, mark, onError, source) => {
//             // console.log({ name, data, source });
//         });
//         origPostProgramCreate(program);
//     };

//     tsc.createWatchProgram(host);
// }

// function reportDiagnostic(diagnostic) {
//     console.error(
//         'Error',
//         diagnostic.code,
//         ':',
//         tsc.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine()),
//     );
// }

// function reportWatchStatusChanged(diagnostic) {
//     let message = tsc.formatDiagnostic(diagnostic, formatHost);
//     if (message.indexOf('TS6194') > 0) {
//         message = message.replace(/message\sTS[0-9]{4}:(.+)(\s+)$/, '$1');
//         // console.ready({ message, badge: true });
//     }
// }

const reportDiagnostics = (diagnostics: tsc.Diagnostic[]) => {
    if (diagnostics.length) {
        const host = {
            getCurrentDirectory: tsc.sys.getCurrentDirectory,
            getCanonicalFileName: (_) => _,
            getNewLine: () => tsc.sys.newLine,
        };
        console.log(tsc.formatDiagnosticsWithColorAndContext(diagnostics, host));
    }
};

const compile = () => {
    const parsedCommandLineToConfigFile = () => {
        const configPath = tsc.findConfigFile('./', tsc.sys.fileExists, 'tsconfig.json');
        const pathConfigHost = {
            fileExists: tsc.sys.fileExists,
            readFile: tsc.sys.readFile,
            readDirectory: tsc.sys.readDirectory,
            getCurrentDirectory: tsc.sys.getCurrentDirectory,
            onUnRecoverableConfigFileDiagnostic: (diagnostic: tsc.Diagnostic) => {
                console.log(diagnostic);
                reportDiagnostics([diagnostic]);
                logger.error(
                    typeof diagnostic.messageText === 'string'
                        ? diagnostic.messageText
                        : diagnostic.messageText.messageText,
                    true,
                );
            },
            useCaseSensitiveFileNames: true,
        };
        const parsedCommandLine = tsc.getParsedCommandLineOfConfigFile(
            configPath,
            undefined,
            pathConfigHost,
            undefined,
            undefined,
            undefined,
        );
        if (parsedCommandLine.errors.length) {
            reportDiagnostics(parsedCommandLine.errors);
            const [{ messageText }] = parsedCommandLine.errors;
            const message =
                typeof messageText === 'string' ? messageText : messageText?.messageText;
            logger.error(message, true);
        }
        // console.log('commandLine', parsedCommandLine);
        return parsedCommandLine;
    };
    const parsedCommandLine = parsedCommandLineToConfigFile();
    const compilerHost = tsc.createCompilerHost(parsedCommandLine.options);
    console.log({
        files: parsedCommandLine.fileNames,
        options: parsedCommandLine.options,
    });
    const program = tsc.createProgram(
        parsedCommandLine.fileNames,
        parsedCommandLine.options,
        compilerHost,
    );
    const emitResult = program.emit(
        undefined,
        undefined,
        undefined,
        !parsedCommandLine.options.emitDeclarationOnly,
        undefined,
    );
    const allDiagnostics = tsc.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    reportDiagnostics(allDiagnostics);
    if (emitResult.emitSkipped && !parsedCommandLine.options.noEmit) {
        console.log({ emitResult });
        logger.error('TypeScript Compile Failed!', true);
    }
};

const watch = () => {
    const configPath = tsc.findConfigFile('./', tsc.sys.fileExists, 'tsconfig.json');
    const reportDiagnostic = (diagnostic: tsc.Diagnostic) => {
        reportDiagnostics([diagnostic]);
    };
    const host = tsc.createWatchCompilerHost(
        configPath,
        undefined,
        tsc.sys,
        tsc.createSemanticDiagnosticsBuilderProgram,
        reportDiagnostic,
        reportDiagnostic,
    );
    host.afterProgramCreate = (buildProgram) => {
        const writeFileName = (s: string) => tsc.sys.write(s + tsc.sys.newLine);
        const compilerOptions = buildProgram.getCompilerOptions();
        const newLine = (tsc as any).getNewLineCharacter(compilerOptions, function () {
            return tsc.sys.newLine;
        });
        (tsc as any).emitFilesAndReportErrors(
            buildProgram,
            reportDiagnostic,
            writeFileName,
            function (errorCount: number) {
                // console.log({ errorCount });
                return host.onWatchStatusChange?.(
                    (tsc as any).createCompilerDiagnostic(
                        (tsc as any).getWatchErrorSummaryDiagnosticMessage(errorCount),
                    ),
                    newLine,
                    compilerOptions,
                    errorCount,
                );
            },
            undefined,
            undefined,
            !!compilerOptions.emitDeclarationOnly,
            undefined,
        );
    };
    return tsc.createWatchProgram(host);
};

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
            build: async (baseConfig: { watch?: boolean }) => {
                watch();
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
