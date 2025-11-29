
import { DependencyAndVersion, InteractionConfig } from '../shared';
/**
 * 瀑布钩子的公共接口：用于串行执行函数链，每个函数的输出作为下一个函数的输入。
 */
export interface IWaterfallHook<Result, Args extends any[]> {
    tap(name: string, fn: HookFnWaterfall<Result, Args>): void;
    tapAsync(name: string, fn: HookFnWaterfall<Result, Args>): void;
    // call 的第一个参数是初始结果 (Result)
    call(...args: [Result, ...Args]): Promise<Result>;
}

/**
 * 并行钩子的公共接口：用于并发执行函数，不关心返回值。
 */
export interface IParallelHook<Args extends any[]> {
    tap(name: string, fn: HookFnParallel<Args>): void;
    tapAsync(name: string, fn: HookFnParallel<Args>): void;
    call(...args: Args): Promise<void>;
}
export type HookFnWaterfall<Result, Args extends any[]> = (
    result: Result,
    ...args: Args
) => Promise<Result> | Result;
export type HookFnParallel<Args extends any[]> = (...args: Args) => Promise<void> | void;
export interface LaniaCommandHooks {
    onInitialize: IParallelHook<[]>;
    onCommandPreInit: IParallelHook<[]>;
    onSuccess: IParallelHook<[any]>;
    onError: IParallelHook<[Error]>;
    onArgsParsed: IWaterfallHook<any, []>;
    onFilesPrepare: IWaterfallHook<string[], []>;
    onConfigGet: IWaterfallHook<any, [string]>;
    onConfigResolve: IWaterfallHook<any, [string]>;
    onPluginApiCall: IParallelHook<[string, string, any[]]>;
    onFileWrite: IWaterfallHook<string, [string, BufferEncoding]>;
    onTemplateParse: IWaterfallHook<
        { templateContent: string; context: Record<string, any> },
        [string]
    >;
    onDependenciesModify: IWaterfallHook<{ dependencies: DependencyAndVersion[], devDependencies: DependencyAndVersion[] }, [InteractionConfig]>;
    onDependenciesInstall: IWaterfallHook<any, []>;
    onInteractionPrompt: IWaterfallHook<any, []>;
    onShellCommand: IParallelHook<string[]>;
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
