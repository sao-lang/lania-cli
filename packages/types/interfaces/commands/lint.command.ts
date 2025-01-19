export interface LintActionOptions {
    linters?: string[];
    fix?: boolean;
}
export interface LinterConfigItem {
    linter?: string;
    config?: Record<string, any>;
}

export type LintActionHandleConfigsParam = (LinterConfigItem | string)[];
