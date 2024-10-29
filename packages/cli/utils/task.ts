type Task<T> = () => Promise<T>;

interface Options {
    concurrency?: number;
    retries?: number;
    timeout?: number;
}

interface TaskResult<T> {
    status: 'fulfilled' | 'rejected';
    value: T | null;
}

// 单个任务运行器，包含重试和超时控制
const runWithRetry = async <T>(task: Task<T>, retries: number, timeout: number): Promise<TaskResult<T>> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await (timeout ? applyTimeout(task, timeout) : task());
            return { status: 'fulfilled', value: result };
        } catch (error) {
            if (attempt === retries) return { status: 'rejected', value: null };
        }
    }
    return { status: 'rejected', value: null };
};

// 应用超时控制的辅助函数
const applyTimeout = <T>(task: Task<T>, timeout: number): Promise<T> =>
    Promise.race([
        task(),
        new Promise<T>((_, reject) => setTimeout(() => reject('任务超时'), timeout)),
    ]);

// 并行执行函数
export const parallel = async <T>(tasks: Task<T>[], options: Options = {}): Promise<TaskResult<T>[]> => {
    const { concurrency = Infinity, retries = 0, timeout = 0 } = options;
    const results: TaskResult<T>[] = Array(tasks.length);
    const executing: Promise<void>[] = [];

    for (let i = 0; i < tasks.length; i++) {
        const exec = async () => {
            results[i] = await runWithRetry(tasks[i], retries, timeout);
        };
        executing.push(exec());
        if (executing.length >= concurrency) await Promise.race(executing).finally(() => executing.splice(0, 1));
    }

    await Promise.all(executing);
    return results;
};

// 串行执行函数
export const series = async <T>(tasks: Task<T>[], options: Options = {}): Promise<TaskResult<T>[]> => {
    const { retries = 0, timeout = 0 } = options;
    const results: TaskResult<T>[] = [];

    for (const task of tasks) {
        results.push(await runWithRetry(task, retries, timeout));
    }

    return results;
};
