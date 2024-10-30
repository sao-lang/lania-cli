type Task<T> = () => Promise<T>;

interface Options {
    concurrency?: number;
    retries?: number;
    timeout?: number;
}

interface TaskResult<T> {
    status: 'fulfilled' | 'rejected';
    value: T | null;
    reason?: string | null
}

// 单个任务运行器，包含重试和超时控制
const runWithRetry = async <T>(task: Task<T>, retries: number, timeout: number): Promise<TaskResult<T>> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const [err, res] = await to(timeout ? applyTimeout(task, timeout) : task());
        if (err && attempt === retries) {
            return { status: 'rejected', value: null, reason: err.message };
        }
        return { status: 'fulfilled', value: result, reason: null };
    }
    return { status: 'rejected', value: null, reason: null };
};

// 应用超时控制的辅助函数
const applyTimeout = <T>(task: Task<T>, timeout: number): Promise<T> =>
    Promise.race([
        task(),
        new Promise<T>((_, reject) => setTimeout(() => reject('任务超时'), timeout)),
    ]);

// 并行执行函数
export const parallel = async <T>(tasks: Task<T>[], options: Options = {}): Promise<TaskResult<T>[]> => {
    const { concurrency = 4, retries = 0, timeout = 0 } = options;
    const results: TaskResult<T>[] = Array(tasks.length);
    const executing = new Set<Promise<void>>();

    for (let i = 0; i < tasks.length; i++) {
        const exec = async () => {
            results[i] = await runWithRetry(tasks[i], retries, timeout);
        };

        const taskPromise = exec().finally(() => {
            // 任务完成后从 Set 中删除
            executing.delete(taskPromise);
        });
        
        // 将任务添加到 Set 中
        executing.add(taskPromise);

        // 如果正在执行的任务数量达到了并发限制，等待任一任务完成
        if (executing.size >= concurrency) {
            await Promise.race(executing);
        }
    }

    // 等待所有任务完成
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
