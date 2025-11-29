import type { Hook } from '@lania-cli/common';
import { DepencencyAndVresion } from '../shared';
export type HookFnWaterfall<Result, Args extends any[]> = (
    result: Result,
    ...args: Args
) => Promise<Result> | Result;
export type HookFnParallel<Args extends any[]> = (...args: Args) => Promise<void> | void;

export interface WaterfallHook<Result, Args extends any[]>
    extends Hook<HookFnWaterfall<Result, Args>> {}
export interface ParallelHook<Args extends any[]> extends Hook<HookFnParallel<Args>> {}

export interface LaniaCommandHooks {
    onInitialize: ParallelHook<[]>;
    onCommandPreInit: ParallelHook<[]>;
    onSuccess: ParallelHook<[any]>;
    onError: ParallelHook<[Error]>;
    onArgsParsed: WaterfallHook<any, []>;
    onFilesPrepare: WaterfallHook<string[], []>;
    onConfigGet: WaterfallHook<any, [string]>;
    onConfigResolve: WaterfallHook<any, [string]>;
    onPluginApiCall: ParallelHook<[string, string, any[]]>;
    onFileWrite: WaterfallHook<string, [string, string]>;
    onTemplateParse: WaterfallHook<
        { templateContent: string; context: Record<string, any> },
        [string]
    >;
    onDependenciesModify: WaterfallHook<
        { dependencies: DepencencyAndVresion[]; devDependencies: DepencencyAndVresion[] },
        []
    >;
    onDependenciesInstall: WaterfallHook<any, []>;
    onInteractionPrompt: WaterfallHook<any, []>;
    onShellCommand: ParallelHook<[string, string]>;
}

export type AnyPlugin = any;

export interface IPluginContainer {
    get<T extends AnyPlugin>(name: string): T;
    register(name: string, plugin: AnyPlugin): void;
}
export interface CommandActionInstruction {
    plugin: string;
    method: string;
    hook: 'preAction' | 'postAction' | 'onError';
    argsMap?: string[];
    condition?: (argv: any) => boolean;
}
