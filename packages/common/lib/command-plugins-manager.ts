// ======================================================================
// command-plugin-manager.ts
// 插件 Hook 机制和 PluginManager 实现
// ======================================================================

// 导入所有类型，确保类型正确性
import {
    AnyPlugin,
    Hook,
    WaterfallHook as IWaterfallHook,
    ParallelHook as IParallelHook,
    HookFnWaterfall,
    HookFnParallel,
    IPluginContainer,
} from '@lania-cli/types';

// --- 具体的 Hook 实现 ---

export class WaterfallHook<Result, Args extends any[]>
    extends Hook<HookFnWaterfall<Result, Args>>
    implements IWaterfallHook<Result, Args>
{
    protected taps: { name: string; fn: HookFnWaterfall<Result, Args> }[] = [];

    public tap(name: string, fn: HookFnWaterfall<Result, Args>): void {
        this.taps.push({ name, fn });
    }

    public async call(initialResult: Result, ...args: Args): Promise<Result> {
        let result = initialResult;
        for (const { fn, name } of this.taps) {
            try {
                // 串行调用，前一个结果是后一个的输入
                result = await fn(result, ...args);
            } catch (error) {
                // LaniaCommand 中的错误处理会捕获，这里仅记录
                console.error(`[PluginManager] WaterfallHook '${name}' failed:`, error);
                throw error;
            }
        }
        return result;
    }
}

export class ParallelHook<Args extends any[]>
    extends Hook<HookFnParallel<Args>>
    implements IParallelHook<Args>
{
    protected taps: { name: string; fn: HookFnParallel<Args> }[] = [];

    public tap(name: string, fn: HookFnParallel<Args>): void {
        this.taps.push({ name, fn });
    }

    public async call(...args: Args): Promise<void> {
        // 并行执行所有 Hook
        await Promise.all(
            this.taps.map(async ({ fn, name }) => {
                try {
                    await fn(...args);
                } catch (error) {
                    console.error(
                        `[PluginManager] ParallelHook '${name}' failed during execution.`,
                        error,
                    );
                    // Parallel Hook 失败通常只记录，不中断 Promise.all
                }
            }),
        );
    }
}

/**
 * 辅助函数：根据类型创建 Hook 实例
 */
export const createHook = (type: 'waterfall' | 'parallel'): any => {
    if (type === 'waterfall') {
        return new WaterfallHook<any, any>();
    }
    if (type === 'parallel') {
        return new ParallelHook<any>();
    }
    throw new Error(`Unknown hook type: ${type}`);
};

/**
 * PluginManager 的实现
 */
export class PluginManager implements IPluginContainer {
    private plugins = new Map<string, AnyPlugin>();

    public register(name: string, plugin: AnyPlugin): void {
        this.plugins.set(name, plugin);
    }

    public get<T extends AnyPlugin>(name: string): T {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            throw new Error(`Plugin "${name}" not registered.`);
        }
        return plugin as T;
    }
}
