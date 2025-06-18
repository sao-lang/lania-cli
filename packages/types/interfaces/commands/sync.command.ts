export type SyncActionOptions = {
    message?: string;
    branch?: string;
    normatively?: boolean;
    remote?: string;
};

export interface SubMergeActionOptions {
    mergedBranch?: string;
    ff?: boolean;
    ffOnly?: boolean;
    squash?: boolean;
    commit?: boolean;
    abort?: boolean;
}

export type SubAddActionOptions = string[];

export interface SubCommitActionOptions {
    m?: string;
}