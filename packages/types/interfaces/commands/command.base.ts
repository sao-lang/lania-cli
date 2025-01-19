export interface LaniaCommandActionInterface<Args extends any[] = any[]> {
    handle(...args: Args): Promise<void>;
}

export interface CommandNeededArgsInterface {
    name: string;
    description?: string;
    options: { flags: string; description?: string; defaultValue?: string | boolean | string[] }[];
    alias?: string;
}