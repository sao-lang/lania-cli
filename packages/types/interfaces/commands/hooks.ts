export type HookFnWaterfall<Result, Args extends any[]> = (
    result: Result,
    ...args: Args
) => Promise<Result> | Result;
export type HookFnParallel<Args extends any[]> = (...args: Args) => Promise<void> | void;

// Hook 实例接口 (用于运行时引用)
// eslint-disable-next-line @typescript-eslint/ban-types
export abstract class Hook<T extends Function> {
    public abstract tap(name: string, fn: T): void;
    public abstract call(...args: any[]): Promise<any>;
}

// 具体的 Hook 类型，LaniaCommandHooks 将使用这些类型
export interface WaterfallHook<Result, Args extends any[]>
    extends Hook<HookFnWaterfall<Result, Args>> {}
export interface ParallelHook<Args extends any[]> extends Hook<HookFnParallel<Args>> {}

// ======================================================================
// 2. LaniaCommand Hooks 接口 (新的 Hook 系统)
// ======================================================================

export interface LaniaCommandHooks {
    // I. 生命周期/启动 Hooks
    onInitialize: ParallelHook<[]>;
    onCommandPreInit: ParallelHook<[]>; // 在应用插件前
    onSuccess: ParallelHook<[any]>;
    onError: ParallelHook<[Error]>;

    // II. 命令解析 Hooks
    onArgsParsed: WaterfallHook<any, []>;
    onFilesPrepare: WaterfallHook<string[], []>;

    // III. 配置/工具 Hooks
    onConfigGet: WaterfallHook<any, [string]>; // 原始配置获取后 (e.g., config file read)
    onConfigResolve: WaterfallHook<any, [string]>; // 配置最终合并和解析后
    onPluginApiCall: ParallelHook<[string, string, any[]]>; // 监控插件间调用 (pluginName, method, args)

    // IV. 文件系统/I/O Hooks
    onFileWrite: WaterfallHook<string, [string, string]>; // (content, filePath, encoding)
    onTemplateParse: WaterfallHook<
        { templateContent: string; context: Record<string, any> },
        [string]
    >; // (data, templatePath)
    onDependenciesModify: WaterfallHook<string[], []>;
    onInteractionPrompt: WaterfallHook<any, []>; // (questionObject/array)
    onShellCommand: ParallelHook<[string, string]>;
}

// ======================================================================
// 3. 插件管理和服务类型
// ======================================================================

export type AnyPlugin = any;

export interface IPluginContainer {
    get<T extends AnyPlugin>(name: string): T;
    register(name: string, plugin: AnyPlugin): void;
}

// ======================================================================
// 4. LaniaCommand 配置和动作类型扩展
// ======================================================================

// 自动化动作指令接口
export interface CommandActionInstruction {
    plugin: string; // 插件名称 (例如: 'vite')
    method: string; // 插件实例上要调用的方法 (例如: 'createServer')
    hook: 'preAction' | 'postAction' | 'onError'; // 触发时机
    argsMap?: string[]; // 从 argv 映射到方法参数的键名
    condition?: (argv: any) => boolean; // 执行条件
}
