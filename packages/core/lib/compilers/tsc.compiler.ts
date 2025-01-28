import logger from '@utils/logger';
import path from 'path';
import tsc from 'typescript';

const reportDiagnostics = (diagnostics: tsc.Diagnostic[]) => {
    console.log('diagnostics', diagnostics);
    if (diagnostics.length) {
        const host = {
            getCurrentDirectory: tsc.sys.getCurrentDirectory,
            getCanonicalFileName: (_) => _,
            getNewLine: () => tsc.sys.newLine,
        };
        console.log(tsc.formatDiagnosticsWithColorAndContext(diagnostics, host));
    }
};

const compile = (configFile?: string) => {
    const dirname = configFile ? path.dirname(configFile) : '';
    const configPath = tsc.findConfigFile(dirname || './', tsc.sys.fileExists, 'tsconfig.json');
    const parsedCommandLineToConfigFile = () => {
        const pathConfigHost: tsc.ParseConfigFileHost = {
            fileExists: tsc.sys.fileExists,
            readFile: tsc.sys.readFile,
            readDirectory: tsc.sys.readDirectory,
            getCurrentDirectory: tsc.sys.getCurrentDirectory,
            onUnRecoverableConfigFileDiagnostic: (diagnostic: tsc.Diagnostic) => {
                // console.log(diagnostic);
                reportDiagnostics([diagnostic]);
                logger.error(
                    typeof diagnostic.messageText === 'string'
                        ? diagnostic.messageText
                        : diagnostic.messageText.messageText,
                    true,
                );
            },
            useCaseSensitiveFileNames: true,
            trace: (string) => {
                console.log('trace', string);
            },
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
            throw new Error(message);
        }
        return parsedCommandLine;
    };
    const parsedCommandLine = parsedCommandLineToConfigFile();
    const compilerHost = tsc.createCompilerHost(parsedCommandLine.options);
    const program = tsc.createProgram(
        parsedCommandLine.fileNames,
        parsedCommandLine.options,
        compilerHost,
    );
    const emitResult = program.emit(
        undefined,
        tsc.sys.writeFile,
        undefined,
        !parsedCommandLine.options.emitDeclarationOnly,
        undefined,
    );
    const allDiagnostics = tsc.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    reportDiagnostics(allDiagnostics);
    // if (emitResult.emitSkipped && !parsedCommandLine.options.noEmit) {
    //     console.log({ emitResult });
    //     // logger.error('TypeScript Compile Failed!', true);
    // }
};

const compileOnWatch = (configFile?: string) => {
    const dirname = configFile ? path.dirname(configFile) : '';
    const configPath = tsc.findConfigFile(dirname || './', tsc.sys.fileExists, 'tsconfig.json');
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

// export default class TscCompiler extends Compiler<{ watch?: boolean }> {
//     constructor(configOption?: { configPath?: string }) {
//         const { configPath } = configOption || {};
//         const baseCompiler: BaseCompilerInterface = {
//             build: async (baseConfig: { watch?: boolean }) => {
//                 const { watch } = baseConfig;
//                 if (watch) {
//                     compileOnWatch(configPath);
//                 } else {
//                     compile(configPath);
//                 }
//             },
//         };
//         super(baseCompiler, undefined, undefined);
//     }
// }
