import { TaskItem, TaskResult, TaskConfig } from '@lania-cli/types';

export interface ExtendedTaskConfig extends TaskConfig {
    stopOnError?: boolean;
}

export class TaskExecutor {
    public queue: TaskItem[] = [];
    public runningTasks: Set<TaskItem> = new Set();
    public results: TaskResult<any>[] = [];
    public readonly config: ExtendedTaskConfig;
    private paused = false;
    private running = false;
    private resolveWhenDone: (() => void) | null = null;
    private rejectWhenError: ((err: Error) => void) | null = null; // 新增
    private globalAbort = new AbortController();
    private groupAbort = new Map<string, AbortController>();
    private activeCounts: Map<string, number> = new Map();
    private shouldStop = false;

    constructor(initialTasks: TaskItem[] = [], config: ExtendedTaskConfig = {}) {
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
        } else {
            this.globalAbort.abort();
        }
        this.shouldStop = true;
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

    private async executeTask(taskItem: TaskItem): Promise<void> {
        const {
            maxRetries = 0,
            retryDelay = 100,
            timeout = 10000,
            stopOnError = false,
        } = this.config;
        let retries = 0;
        const group = taskItem.group || 'default';
        const signal = this.getSignalForGroup(group);
        const groupKey = group;

        this.runningTasks.add(taskItem);
        this.activeCounts.set(groupKey, (this.activeCounts.get(groupKey) || 0) + 1);

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
            this.activeCounts.set(groupKey, (this.activeCounts.get(groupKey) || 0) - 1);

            if (!result.success && stopOnError) {
                this.shouldStop = true;
                this.rejectWhenError?.(
                    result.error ?? new Error('Unknown task error')
                ); // 立即让 run() reject
                this.cancel();
            }
        };

        const runAttempt = async (): Promise<TaskResult<any>> => {
            try {
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Task timed out')), timeout),
                );
                const result = await Promise.race([taskItem.task(), timeoutPromise]);
                if (signal.aborted) {
                    return { success: false, error: new Error('Task cancelled'), retries };
                }
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

        try {
            const result = await runAttempt();
            finish(result);
        } catch (error) {
            finish({
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                retries,
            });
        } finally {
            this.runNext();
        }
    }

    public async run(): Promise<TaskResult<any>[]> {
        if (this.running) return this.results;
        this.running = true;
        this.shouldStop = false;

        const donePromise = new Promise<void>((resolve) => (this.resolveWhenDone = resolve));
        const errorPromise = new Promise<never>((_, reject) => (this.rejectWhenError = reject));

        this.runNext();

        // 如果 stopOnError=true，errorPromise 会优先 reject
        await (this.config.stopOnError
            ? Promise.race([donePromise, errorPromise])
            : donePromise);

        return this.results;
    }

    private async runNext(): Promise<void> {
        if (!this.running || this.paused || this.shouldStop) return;

        while (this.queue.length > 0) {
            const nextIndex = this.queue.findIndex((t) => this.canRun(t.group));
            if (nextIndex === -1) break;
            if (this.shouldStop) break;

            const [taskItem] = this.queue.splice(nextIndex, 1);
            this.executeTask(taskItem).catch((err) => {
                console.error('executeTask error:', err);
            });
        }

        if (this.queue.length === 0 && this.runningTasks.size === 0 && this.resolveWhenDone) {
            this.running = false;
            this.shouldStop = false;
            this.resolveWhenDone();
            this.resolveWhenDone = null;
        }
    }

    private getSignalForGroup(group?: string): AbortSignal {
        if (!group) return this.globalAbort.signal;
        if (!this.groupAbort.has(group)) {
            this.groupAbort.set(group, new AbortController());
        }
        return this.groupAbort.get(group)!.signal;
    }

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
