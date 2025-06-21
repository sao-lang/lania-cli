export interface CommandOption {
    flags: string;
    description: string;
    defaultValue?: any;
    required?: boolean;
    choices?: string[];
    args?: string[];
    name?: string;
    overrideNoPrefixParsing?: boolean; // 单个选项覆盖
    parser?: (value: any) => any;
}

export interface CommandNeededArgsInterface {
    name: string;
    description?: string;
    options?: CommandOption[];
    alias?: string;
    examples?: string[];
    helpDescription?: string;
    args?: string[];
    overrideNoPrefixParsing?: boolean; // 单个选项覆盖
}

export type CommandHook = () => Promise<void> | void;

export interface LaniaCommandActionInterface<T extends any[] = any[]> {
    handle: (...args: T) => Promise<void> | void;
}

export interface YargsOption {
    describe?: string;
    type: 'string' | 'boolean' | 'number';
    choices?: string[];
    default?: any;
    demandOption?: boolean;
    coerce?: (value: any) => any;
    alias?: string
}
