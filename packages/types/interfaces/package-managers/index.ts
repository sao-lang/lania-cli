
export interface PackageManagerCommandFlags {
    saveFlag: string;
    saveDevFlag: string;
    silentFlag: string;
    initFlag: string;
}

export interface PackageManagerCommands {
    install: string;
    add: string;
    update: string;
    remove: string;
    init: string;
}

export type PackageManagerName = 'npm' | 'yarn' | 'pnpm';