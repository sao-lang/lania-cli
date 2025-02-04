import { EventEmitter } from 'events';
import {
    TaskConfiguration,
    TaskStatus,
    TaskEvent,
    TaskContext,
    TaskEventType,
} from '@lania-cli/types';

export class Task extends EventEmitter {
    public status: TaskStatus = 'pending';
    public progress = 0;
    public attempts = 0;

    constructor(
        public readonly id: string,
        public readonly config: TaskConfiguration,
    ) {
        super();
    }
}

export class TaskRunner extends EventEmitter {
    private tasks: Task[] = [];
    private abortController = new AbortController();

    constructor(private maxParallel = 1) {
        super();
    }

    // 添加单个任务
    private createTask(config: TaskConfiguration): this {
        const task = new Task(this.generateTaskId(), config);
        this.tasks.push(task);
        return this;
    }

    // 串行任务组
    public series(...tasks: TaskConfiguration[]): this {
        tasks.forEach((task) => this.createTask({ ...task, mode: 'serial' }));
        return this;
    }

    // 并行任务组
    public parallel(...tasks: TaskConfiguration[]): this {
        tasks.forEach((task) => this.createTask({ ...task, mode: 'parallel' }));
        return this;
    }

    // 执行任务
    public async run() {
        try {
            await this.executeTasks(this.tasks);
        } catch (error) {
            this.emit('error', error);
        }
    }

    // 取消任务
    public cancel() {
        this.abortController.abort();
    }

    // 执行任务列表
    private async executeTasks(tasks: Task[]) {
        const groupedTasks = this.groupTasksByMode(tasks);

        for (const group of groupedTasks) {
            if (group.mode === 'serial') {
                await this.runSerialTasks(group.tasks);
            } else {
                await this.runParallelTasks(group.tasks);
            }
        }
    }

    // 按模式分组任务
    private groupTasksByMode(tasks: Task[]) {
        const groups: { mode: 'serial' | 'parallel'; tasks: Task[] }[] = [];
        let currentGroup: (typeof groups)[number] | null = null;

        for (const task of tasks) {
            const mode = task.config.mode || 'serial';

            if (currentGroup && currentGroup.mode === mode) {
                currentGroup.tasks.push(task);
            } else {
                currentGroup = { mode, tasks: [task] };
                groups.push(currentGroup);
            }
        }

        return groups;
    }

    // 串行执行任务
    private async runSerialTasks(tasks: Task[]) {
        for (const task of tasks) {
            if (this.abortController.signal.aborted) break;
            await this.executeTaskWithRetry(task);
        }
    }

    // 并行执行任务
    private async runParallelTasks(tasks: Task[]) {
        const runningTasks = [];

        for (const task of tasks) {
            if (this.abortController.signal.aborted) break;

            if (runningTasks.length >= this.maxParallel) {
                await Promise.race(runningTasks);
            }

            runningTasks.push(this.executeTaskWithRetry(task));
        }

        await Promise.all(runningTasks);
    }

    // 带重试的任务执行
    private async executeTaskWithRetry(task: Task) {
        while (task.attempts <= (task.config.retries || 0)) {
            try {
                task.attempts++;
                await this.executeSingleTask(task);
                return;
            } catch (error) {
                if (task.attempts > (task.config.retries || 0)) {
                    this.emitTaskEvent(task, 'error', error);
                    if (!task.config.continueOnError) throw error;
                    return;
                }
                this.emitTaskEvent({ ...task, progress: 0 }, 'retry', error as Error, true);
                this.emitTaskEvent(task, 'retry', error as Error);
            }
        }
    }

    // 执行单个任务
    private async executeSingleTask(task: Task) {
        const abortController = new AbortController();
        abortController.signal.addEventListener(
            'abort',
            () => {
                this.emitTaskEvent(task, 'cancel');
            },
            { once: true },
        );
        const timeout = task.config.timeout || 0;

        const context: TaskContext = {
            cancel: () => abortController.abort(),
        };
        this.emitTaskEvent({ ...task, progress: 0 }, 'start', null, true);
        this.emitTaskEvent(task, 'start');
        task.config.onStart?.(context);

        try {
            await Promise.race([
                task.config.execute(context),
                this.createTimeout(timeout, abortController),
                this.createAbortSignalListener(abortController),
            ]);

            // 触发任务成功钩子
            task.config.onSuccess?.(context);
            this.emitTaskEvent({ ...task, progress: 100 }, 'success', null, true);
            this.emitTaskEvent(task, 'success');
        } catch (error) {
            task.config.onError?.(error, context);
            if (error.message.toLowerCase().includes('timeout')) {
                // 触发任务超时钩子
                task.config.onTimeout?.(context);
            }
            // 触发任务失败钩子
            this.emitTaskEvent(task, 'error', error);
            throw error;
        }
    }

    // 发送任务事件
    private emitTaskEvent(
        task: Task,
        eventType: TaskEventType,
        error?: Error,
        shouldChangeProgress?: boolean,
    ) {
        const statusTransformedMap = {
            retry: 'running',
            start: 'running',
            cancel: 'error',
        };
        const event: TaskEvent = {
            ...task,
            taskId: task.id,
            name: task.config.name,
            status: statusTransformedMap[eventType] ?? eventType,
            attempts: task.attempts,
            error,
        };

        this.emit(shouldChangeProgress ? 'progress' : eventType, event);
        this.emit('*', event);
    }

    // 创建超时控制器
    private createTimeout(timeout: number, controller: AbortController) {
        return new Promise((_, reject) => {
            if (timeout <= 0) return;

            const timer = setTimeout(() => {
                controller.abort();
                reject(new Error(`Timeout after ${timeout}ms`));
            }, timeout);

            controller.signal.addEventListener('abort', () => clearTimeout(timer));
        });
    }

    // 创建中止信号监听器
    private createAbortSignalListener(controller: AbortController) {
        return new Promise((_, reject) => {
            if (this.abortController.signal.aborted) {
                return reject(new Error('Execution cancelled'));
            }

            const handler = () => {
                controller.abort();
                reject(new Error('Execution cancelled'));
            };

            this.abortController.signal.addEventListener('abort', handler);
        });
    }

    // 生成任务ID
    private generateTaskId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
}
