export type SyncActionOptions = {
    message?: string;
    branch?: string;
    normatively?: boolean;
    remote?: string;
};

export interface SubMergeActionOptions {
    branch?: string;
    noFf?: boolean;
    'no-ff'?: boolean;
    ffOnly?: boolean;
    'ff-only'?: boolean;
    squash?: boolean;
    noCommit?: boolean;
    'no-commit'?: boolean;
    abort?: boolean;
    strategy?: string;
    message?: string;
}

export type SubAddActionOptions = {
    files?: string[];
};

export interface SubCommitActionOptions {
    m?: string;
}