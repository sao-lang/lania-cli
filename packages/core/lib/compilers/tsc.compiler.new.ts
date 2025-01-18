import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export class Compiler {
    private program: ts.Program;
    private watcher: ts.FileWatcher;

    constructor(private configFile: string) {
        const config = ts.readConfigFile(configFile, ts.sys.readFile);
        const parseResult = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configFile));

        this.program = ts.createProgram(parseResult.fileNames, parseResult.options);
        this.createWatcher();
    }

    private createWatcher() {
        // @ts-ignore
        this.watcher = ts.createWatchProgram(this.program);
        // @ts-ignore
        this.watcher.on('fileChanged', this.onFileChanged.bind(this));
    }

    private onFileChanged(fileName: string) {
        this.log(`File changed: ${fileName}`);
        this.compile();
    }

    private compile() {
        const emitResult = this.program.emit();
        const allDiagnostics = ts.getPreEmitDiagnostics(this.program).concat(emitResult.diagnostics);

        allDiagnostics.forEach(diagnostic => {
            if (diagnostic.file) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                this.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
            } else {
                this.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
            }
        });
    }

    private log(message: string) {
        // 自定义日志功能
        console.log(`[Compiler]: ${message}`);
    }
}
