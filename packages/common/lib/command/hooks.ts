import { HookFnWaterfall, HookFnParallel, IWaterfallHook, IParallelHook } from '@lania-cli/types';

// eslint-disable-next-line @typescript-eslint/ban-types
export abstract class Hook<T extends Function> {
    public abstract tap(name: string, fn: T): void;
    public abstract tapAsync(name: string, fn: T): void;
    public abstract call(...args: any[]): Promise<any>;
}
export class WaterfallHook<Result, Args extends any[]>
    extends Hook<HookFnWaterfall<Result, Args>>
    implements IWaterfallHook<Result, Args>
{
    protected taps: {
        name: string;
        fn: HookFnWaterfall<Result, Args>;
        isPromise: boolean;
    }[] = [];
    public tap(name: string, fn: HookFnWaterfall<Result, Args>): void {
        this.taps.push({ name, fn, isPromise: false });
    }
    public tapAsync(name: string, fn: HookFnWaterfall<Result, Args>): void {
        this.taps.push({ name, fn, isPromise: true });
    }
    public async call(...args: [Result, ...Args]): Promise<Result> {
        const [initialResult, ...other] = args;
        let result = initialResult;
        for (const { fn, name } of this.taps) {
            try {
                result = await fn(result, ...other);
            } catch (error) {
                console.error(`[PluginManager] WaterfallHook '${name}' failed:`, error);
                throw error;
            }
        }
        return result;
    }
}

export class ParallelHook<Args extends any[]> extends Hook<HookFnParallel<Args>> implements IParallelHook<Args> {
    protected taps: { name: string; fn: HookFnParallel<Args>; isPromise: boolean }[] = [];
    public tap(name: string, fn: HookFnParallel<Args>): void {
        this.taps.push({ name, fn, isPromise: false });
    }
    public tapAsync(name: string, fn: HookFnParallel<Args>): void {
        this.taps.push({ name, fn, isPromise: true });
    }
    public async call(...args: Args): Promise<void> {
        const executionPromises = this.taps.map(async ({ fn, name }) => {
            try {
                await fn(...args);
            } catch (error) {
                console.error(
                    `[PluginManager] ParallelHook '${name}' failed during execution.`,
                    error,
                );
            }
        });
        await Promise.all(executionPromises);
    }
}
export const createHook = (type: 'waterfall' | 'parallel'): any => {
    if (type === 'waterfall') {
        return new WaterfallHook<any, any>();
    }
    if (type === 'parallel') {
        return new ParallelHook<any>();
    }
    throw new Error(`Unknown hook type: ${type}`);
};
