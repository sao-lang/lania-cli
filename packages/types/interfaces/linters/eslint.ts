type Severity = 0 | 1 | 2;
interface LintMessage {
    column: number;
    line: number;
    endColumn?: number | undefined;
    endLine?: number | undefined;
    message: string;
    severity: Severity;
}
interface LintResult {
    messages: LintMessage[];
    errorCount: number;
    warningCount: number;
    output?: string | undefined;
}

export interface ESLint {
    lintFiles(patterns: string | string[]): Promise<LintResult[]>;
    lintText(
        code: string,
        options?: { filePath?: string | undefined; warnIgnored?: boolean | undefined },
    ): Promise<LintResult[]>;
}
