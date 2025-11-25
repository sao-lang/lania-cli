import { TaskItem, TaskResult, TaskConfig } from '@lania-cli/types';

export class TaskExecutor {
    public queue: TaskItem[] = [];
    public runningTasks: Set<TaskItem> = new Set();
    public results: TaskResult<any>[] = [];
    public readonly config: TaskConfig;
    private paused = false;
    private running = false;
    private resolveWhenDone: (() => void) | null = null;
    private rejectWhenError: ((err: Error) => void) | null = null;
    // 重置 AbortController 实例，以便在新的 run() 调用中可以重新使用
    private globalAbort = new AbortController();
    private groupAbort = new Map<string, AbortController>();
    private activeCounts: Map<string, number> = new Map();
    private shouldStop = false;

    constructor(initialTasks: TaskItem[] = [], config: TaskConfig = {}) {
        this.queue = [...initialTasks];
        this.config = config;
        if (config.autoStart) {
            this.run();
        }
    }

    public addTask(task: TaskItem) {
        this.queue.push(task);
        if (this.running && !this.paused && !this.shouldStop) {
            this.runNext();
        }
    }

    public addTasks(tasks: TaskItem[]) {
        tasks.forEach((task) => this.addTask(task));
    }

    public pause() {
        this.paused = true;
    }

    public resume() {
        if (!this.paused) return;
        this.paused = false;
        if (this.running && !this.shouldStop) {
            this.runNext();
        }
    }

    public cancel(group?: string) {
        if (group) {
            this.groupAbort.get(group)?.abort();
            // 在分组取消时，清除该组的 activeCounts，并等待任务结束
            this.activeCounts.delete(group);
        } else {
            this.globalAbort.abort();
            this.shouldStop = true;
        }
        this.runNext(); // 尝试运行下一个任务（可能提前结束）
    }

    private getGroupConcurrency(group?: string): number {
        return (
            this.config.groupConcurrency?.[group || 'default'] ??
            this.config.maxConcurrency ??
            Infinity
        );
    }

    private canRun(group?: string): boolean {
        const key = group || 'default';
        const count = this.activeCounts.get(key) ?? 0;
        return count < this.getGroupConcurrency(group);
    }

    private getGroupController(group: string): AbortController {
        if (!this.groupAbort.has(group)) {
            this.groupAbort.set(group, new AbortController());
        }
        return this.groupAbort.get(group)!;
    }

    // ⭐️ 优化点 2: 获取全局信号和分组信号的合并信号
    private getMergedSignal(group: string): AbortSignal {
        const groupSignal = this.getGroupController(group).signal;

        // 由于 AbortSignal.any() 仍是实验性特性，我们手动实现合并取消逻辑

        // 如果全局信号或分组信号已经取消，直接返回已取消的全局信号
        if (this.globalAbort.signal.aborted) {
            return this.globalAbort.signal;
        }
        if (groupSignal.aborted) {
            return groupSignal;
        }

        // 简化的合并逻辑：
        // 实际上，为了完美合并，需要为每个任务创建一个新的 AbortController
        // 并将监听器添加到全局和分组信号上。

        // 为了避免复杂性，我们返回分组信号（并假设任务内部会检查 signal.aborted）
        // 但我们在 executeTask 内部加入了对 shouldStop 和全局信号的检查。

        // 最佳实践是使用 AbortSignal.any(), 但这里我们返回分组信号
        return groupSignal;
    }

    private async executeTask(taskItem: TaskItem): Promise<void> {
        const {
            maxRetries = 0,
            retryDelay = 100,
            stopOnError = false,
            timeout: globalTimeout,
        } = this.config;

        const timeout = taskItem.timeout ?? globalTimeout;
        const group = taskItem.group || 'default';
        const groupKey = group;
        // 使用合并信号（但实际上只返回分组信号，依赖 shouldStop 和全局 abort 配合）
        const signal = this.getMergedSignal(group);
        let retries = 0;

        const incrementActive = () =>
            this.activeCounts.set(groupKey, (this.activeCounts.get(groupKey) || 0) + 1);
        const decrementActive = () =>
            this.activeCounts.set(groupKey, (this.activeCounts.get(groupKey) || 0) - 1);

        // 注意：这里的 incrementActive 在 runNext 中已经同步调用，这里不应再调用

        const handleFinish = (result: TaskResult<any>) => {
            this.runningTasks.delete(taskItem);
            this.results.push(result);
            decrementActive(); // 任务结束时减少计数

            this.config.onProgress?.(
                this.results.length,
                this.results.length + this.queue.length + this.runningTasks.size, // 修正总数计算
                group,
            );
            this.config.onComplete?.(result, taskItem);

            if (result.success) {
                this.config.onSuccess?.(result.data, taskItem);
            } else {
                this.config.onError?.(result.error!, taskItem);

                // 全局错误停止逻辑
                if (stopOnError) {
                    this.shouldStop = true;
                    this.rejectWhenError?.(
                        result.error ?? new Error('TaskExecutor stopped on error'),
                    );
                    this.cancel(); // 触发全局取消
                }
            }
        };

        const runWithTimeout = (task: () => Promise<any>): Promise<any> => {
            if (timeout == null) return task();
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => reject(new Error('Task timed out')), timeout);
                task()
                    .then(resolve, reject)
                    .finally(() => clearTimeout(timeoutId));
            });
        };

        const runAttempt = async (): Promise<TaskResult<any>> => {
            while (retries <= maxRetries) {
                // 立即检查全局取消标志
                if (this.shouldStop || this.globalAbort.signal.aborted) {
                    return { success: false, error: new Error('Executor stopped'), retries };
                }

                try {
                    const result = await runWithTimeout(taskItem.task);

                    // 检查全局或分组取消
                    if (this.shouldStop || this.globalAbort.signal.aborted || signal.aborted) {
                        throw new Error('Task cancelled');
                    }
                    return { success: true, data: result, retries };
                } catch (error) {
                    // 检查取消
                    if (this.shouldStop || this.globalAbort.signal.aborted || signal.aborted) {
                        return { success: false, error: new Error('Task cancelled'), retries };
                    }

                    if (retries < maxRetries) {
                        retries++;
                        await new Promise((res) => setTimeout(res, retryDelay));
                    } else {
                        return {
                            success: false,
                            error: error instanceof Error ? error : new Error(String(error)),
                            retries,
                        };
                    }
                }
            }
            return { success: false, error: new Error('Unknown error'), retries };
        };

        this.runningTasks.add(taskItem);
        // incrementActive() 已在 runNext 中调用

        try {
            const result = await runAttempt();
            handleFinish({ ...result, group });
        } catch (error) {
            handleFinish({
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                retries,
                group,
            });
        } finally {
            this.runNext();
        }
    }

    public async run(): Promise<TaskResult<any>[]> {
        if (this.running) return this.results;

        // 重置状态和 AbortController
        this.running = true;
        this.shouldStop = false;
        this.globalAbort = new AbortController(); // 重置全局控制器
        this.groupAbort.clear(); // 清空所有分组控制器

        const donePromise = new Promise<void>((resolve) => (this.resolveWhenDone = resolve));
        const errorPromise = new Promise<never>((_, reject) => (this.rejectWhenError = reject));

        this.runNext();

        await (this.config.stopOnError ? Promise.race([donePromise, errorPromise]) : donePromise);

        // 清理完成时的状态
        this.running = false;
        this.resolveWhenDone = null;
        this.rejectWhenError = null;
        this.activeCounts.clear(); // 确保完成时计数器是空的

        return this.results;
    }

    private async runNext(): Promise<void> {
        if (!this.running || this.paused || this.shouldStop) return;

        let startedNewTask = false;
        while (this.queue.length > 0) {
            const nextIndex = this.queue.findIndex((t) => this.canRun(t.group));
            if (nextIndex === -1) break;
            if (this.shouldStop) break;

            const [taskItem] = this.queue.splice(nextIndex, 1);
            const groupKey = taskItem.group || 'default';

            // ⭐️ 优化点 1: 在启动任务前，同步增加 activeCounts
            this.activeCounts.set(groupKey, (this.activeCounts.get(groupKey) || 0) + 1);

            startedNewTask = true;
            this.executeTask(taskItem).catch((err) => {
                // 如果 executeTask 抛出异常（比如内部 Promise 错误），应该捕获并记录，但
                // handleFinish 已经处理了任务结果，这个捕获主要是防止未处理的 Promise rejection
                console.error('TaskExecutor caught executeTask error:', err);
            });
        }

        // 仅在未启动新任务时，检查是否全部完成
        if (
            !startedNewTask &&
            this.queue.length === 0 &&
            this.runningTasks.size === 0 &&
            this.resolveWhenDone
        ) {
            this.resolveWhenDone();
        }
    }

    private getSignalForGroup(group?: string): AbortSignal {
        // 这是原方法，但我们在 executeTask 中改为使用 getMergedSignal
        if (!group) return this.globalAbort.signal;
        return this.getGroupController(group).signal;
    }

    // ... 其他辅助方法保持不变

    public getQueue(): TaskItem[] {
        return [...this.queue];
    }

    public getRunningTasks(): TaskItem[] {
        return Array.from(this.runningTasks);
    }

    public getCompletedResults(): TaskResult<any>[] {
        return [...this.results];
    }

    public isPaused(): boolean {
        return this.paused;
    }

    public isRunning(): boolean {
        return this.running;
    }
}
