import { AddCommandSupportTemplate, LangEnum, PackageManagerEnum } from '../../enum';
import { CommandActionInstruction } from './hooks';
import { CommandModule } from 'yargs';
export * from './hooks';
export interface ILaniaCommand {
    /**
     * @description 加载命令模块，通常用于注册到 Yargs。
     * @returns Yargs CommandModule
     */
    load(): CommandModule;

    /**
     * @description 添加命令生命周期钩子。
     * @param type 钩子类型 (beforeExecute, afterExecute, onError)
     * @param fn 钩子函数
     */
    addHook(type: 'beforeExecute' | 'afterExecute' | 'onError', fn: CommandHook): void;

    /**
     * @description 获取父命令配置。
     */
    getParent(): LaniaCommandConfigInterface['parent'] | undefined;

    // 📢 注意：公共属性如 config 不需要暴露，除非外部需要读取它。
}
export interface AddCommandOptions {
    filepath?: string;
    template?: keyof {
        v2: AddCommandSupportTemplate.v2;
        v3: AddCommandSupportTemplate.v3;
        rcc: AddCommandSupportTemplate.rcc;
        rfc: AddCommandSupportTemplate.rfc;
        svelte: AddCommandSupportTemplate.svelte;
        jsx: AddCommandSupportTemplate.jsx;
        tsx: AddCommandSupportTemplate.tsx;
        astro: AddCommandSupportTemplate.astro;
        axios: AddCommandSupportTemplate.axios;
        router: AddCommandSupportTemplate.router;
        store: AddCommandSupportTemplate.store;
        prettier: AddCommandSupportTemplate.prettier;
        eslint: AddCommandSupportTemplate.eslint;
        stylelint: AddCommandSupportTemplate.stylelint;
        editorconfig: AddCommandSupportTemplate.editorconfig;
        gitignore: AddCommandSupportTemplate.gitignore;
        tsconfig: AddCommandSupportTemplate.tsconfig;
        commitlint: AddCommandSupportTemplate.commitlint;
        commitizen: AddCommandSupportTemplate.commitizen;
    };
    name?: string;
}

export interface BuildActionOptions {
    watch?: boolean;
    config?: string;
    path?: string;
    mode?: string;
}

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

export interface LaniaCommandMetadata {
    actor: LaniaCommandActionInterface;
    commandNeededArgs: CommandNeededArgsInterface;
    subcommands?: ILaniaCommand[];
}

export interface LaniaCommandConfigInterface<ActionArgs extends any[] = any[]> {
    actor: LaniaCommandActionInterface<ActionArgs>;
    commandNeededArgs: CommandNeededArgsInterface;
    subcommands?: ILaniaCommand[];
    parent?: ILaniaCommand;
    hooks?: {
        beforeExecute?: CommandHook;
        afterExecute?: CommandHook;
        onError?: CommandHook;
    };
    plugins?: { name: string; config?: any }[];
    autoActions?: CommandActionInstruction[];
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
    alias?: string;
}

export interface CreateCommandOptions {
    name: string;
    directory: string;
    skipInstall: boolean;
    skipGit: boolean;
    language: LangEnum;
    packageManager: PackageManagerEnum;
}

export type CreateActionOptions = Exclude<CreateCommandOptions, 'name'>;

export type DevActionOptions = {
    port: number | string;
    config: string;
    hmr: boolean;
    open: boolean;
    host: string;
    path: string;
    mode: string;
};

export interface LintActionOptions {
    linters?: string[];
    fix?: boolean;
}
export interface LinterConfigItem {
    linter?: string;
    config?: Record<string, any>;
}

export type LintActionHandleConfigsParam = (LinterConfigItem | string)[];

export type SyncActionOptions = {
    message?: string;
    branch?: string;
    normatively?: boolean;
    remote?: string;
    lint?: boolean;
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
    message?: string;
    normatively?: boolean;
    lint?: boolean;
}
