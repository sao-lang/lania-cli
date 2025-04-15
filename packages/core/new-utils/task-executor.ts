interface TaskConfig {
    maxConcurrency?: number;
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    stopOnError?: boolean;
    autoStart?: boolean;
    onProgress?: (done: number, total: number, group?: string) => void;
    onSuccess?: (result: any, task: TaskItem) => void;
    onError?: (error: Error, task: TaskItem) => void;
    onComplete?: (result: TaskResult<any>, task: TaskItem) => void;
    groupConcurrency?: Record<string, number>; // 分组并发限制
}

interface TaskResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    retries: number;
}

interface TaskItem {
    task: () => Promise<any>;
    group?: string;
    priority?: number;
}

export class TaskExecutor {
    private queue: TaskItem[] = [];
    private runningTasks: Set<TaskItem> = new Set();
    private results: TaskResult<any>[] = [];
    private config: TaskConfig;
    private paused = false;
    private running = false;
    private resolveWhenDone: (() => void) | null = null;
    private globalAbort = new AbortController();
    private groupAbort = new Map<string, AbortController>();
    private activeCounts: Map<string, number> = new Map();

    constructor(initialTasks: TaskItem[] = [], config: TaskConfig = {}) {
        this.queue = [...initialTasks];
        this.config = config;
        if (config.autoStart) this.run();
    }

    addTask(task: TaskItem) {
        this.queue.push(task);
        if (this.running && !this.paused) this.runNext();
    }

    pause() {
        this.paused = true;
    }

    resume() {
        if (!this.paused) return;
        this.paused = false;
        if (this.running) this.runNext();
    }

    cancel(group?: string) {
        if (group) {
            this.groupAbort.get(group)?.abort();
        } else {
            this.globalAbort.abort();
        }
    }

    private getGroupConcurrency(group?: string): number {
        return (
            this.config.groupConcurrency?.[group || 'default'] ??
            this.config.maxConcurrency ??
            Infinity
        );
    }

    private canRun(group?: string): boolean {
        const count = this.activeCounts.get(group || 'default') ?? 0;
        return count < this.getGroupConcurrency(group);
    }

    private async executeTask(taskItem: TaskItem): Promise<void> {
        const { maxRetries = 0, retryDelay = 0, timeout = Infinity } = this.config;
        let retries = 0;
        const group = taskItem.group || 'default';
        const signal = this.getSignalForGroup(group);

        this.runningTasks.add(taskItem);
        this.activeCounts.set(group, (this.activeCounts.get(group) || 0) + 1);

        const finish = (result: TaskResult<any>) => {
            this.runningTasks.delete(taskItem);
            this.results.push(result);
            this.config.onProgress?.(
                this.results.length,
                this.results.length + this.queue.length,
                group,
            );
            this.config.onComplete?.(result, taskItem);
            if (result.success) {
                this.config.onSuccess?.(result.data, taskItem);
            } else {
                this.config.onError?.(result.error!, taskItem);
            }
            this.activeCounts.set(group, (this.activeCounts.get(group) || 0) - 1); // 修正此行
        };

        const runAttempt = async (): Promise<TaskResult<any>> => {
            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Task timed out')), timeout),
                );
                const result = await Promise.race([taskItem.task(), timeoutPromise]);
                return { success: true, data: result, retries };
            } catch (error) {
                if (signal.aborted) {
                    return { success: false, error: new Error('Task cancelled'), retries };
                }
                if (retries < maxRetries) {
                    retries++;
                    await new Promise((res) => setTimeout(res, retryDelay));
                    return runAttempt();
                }
                return {
                    success: false,
                    error: error instanceof Error ? error : new Error(String(error)),
                    retries,
                };
            }
        };

        const result = await runAttempt();
        finish(result);
        this.runNext();
    }

    async run(): Promise<TaskResult<any>[]> {
        if (this.running) return this.results;
        this.running = true;
        await new Promise<void>((resolve) => (this.resolveWhenDone = resolve));
        return this.results;
    }

    private async runNext(): Promise<void> {
        if (!this.running || this.paused) return;

        while (this.queue.length > 0) {
            const nextIndex = this.queue.findIndex((t) => this.canRun(t.group));
            if (nextIndex === -1) return;

            const [taskItem] = this.queue.splice(nextIndex, 1);
            this.executeTask(taskItem);
        }

        if (this.queue.length === 0 && this.runningTasks.size === 0 && this.resolveWhenDone) {
            this.running = false;
            this.resolveWhenDone();
        }
    }

    private getSignalForGroup(group?: string): AbortSignal {
        if (!group) return this.globalAbort.signal;
        if (!this.groupAbort.has(group)) {
            this.groupAbort.set(group, new AbortController());
        }
        return this.groupAbort.get(group)!.signal;
    }

    getQueue(): TaskItem[] {
        return [...this.queue];
    }

    getRunningTasks(): TaskItem[] {
        return Array.from(this.runningTasks);
    }

    getCompletedResults(): TaskResult<any>[] {
        return [...this.results];
    }

    isPaused(): boolean {
        return this.paused;
    }

    isRunning(): boolean {
        return this.running;
    }
}
