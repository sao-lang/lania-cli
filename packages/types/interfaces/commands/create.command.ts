export interface CreateCommandOptions {
    name: string;
    directory: string;
    skipInstall: boolean;
    skipGit: boolean;
    language: boolean;
    packageManager: string;
}

export type CreateActionOptions = Exclude<CreateCommandOptions, 'name'>;
