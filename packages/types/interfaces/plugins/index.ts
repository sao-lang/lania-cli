export type CommitType = string;

// 定义可跳过问题的精确联合类型
export type SkipKey = 'scope' | 'subject' | 'body' | 'footer' | 'breakingChange';

export interface CommitizenConfig {
    skipQuestions?: SkipKey[];
    types: { value: CommitType; name: string }[];
    messages: {
        type: string;
        customScope: string;
        subject: string;
        body: string;
        footer: string;
        confirmCommit: string;
        breakingChange: string;
    };
    subjectLimit: number;
    scopes: string[];
    allowCustomScopes: boolean;
    scopeOverrides?: Record<CommitType, string[]>;
    allowBreakingChanges: CommitType[];
    footerPrefix: string;
}

export interface CommitData {
    type: CommitType;
    scope: string;
    subject: string;
    body?: string;
    footer?: string;
    breakingChange?: boolean;
}