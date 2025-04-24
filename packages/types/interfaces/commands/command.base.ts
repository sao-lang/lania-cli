export interface CommandOption {
    flags: string;
    description: string;
    defaultValue?: any;
    required?: boolean;
    choices?: string[];
}

export interface CommandNeededArgsInterface {
    name: string;
    description?: string;
    options?: CommandOption[];
    alias?: string;
    examples?: string[];
    helpDescription?: string;
}

export type CommandHook = () => Promise<void> | void;

export interface LaniaCommandActionInterface<T extends any[] = any[]> {
    handle: (...args: T) => Promise<void> | void;
}
