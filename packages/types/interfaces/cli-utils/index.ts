import { CommandNeededArgsInterface, LaniaCommandActionInterface } from '../commands/command.base';

export type TaskStatus = 'pending' | 'running' | 'success' | 'error' | 'timeout';
export type TaskEventType = TaskStatus | 'retry' | 'start' | 'cancel';

export interface TaskConfiguration {
    name: string;
    execute: (ctx: TaskContext) => Promise<void>;
    mode?: 'serial' | 'parallel';
    timeout?: number;
    retries?: number;
    continueOnError?: boolean;
    onStart?: (ctx: TaskContext) => void;
    onSuccess?: (ctx: TaskContext) => void;
    onError?: (error: Error, ctx: TaskContext) => void;
    onTimeout?: (ctx: TaskContext) => void;
    onRetry?: (attempt: number, ctx: TaskContext) => void;
    onCancel?: (ctx: TaskContext) => void;
}

export interface TaskContext {
    cancel: () => void;
}

export interface TaskEvent {
    taskId: string;
    name: string;
    status: TaskStatus;
    progress?: number;
    message?: string;
    attempts?: number;
    error?: Error;
}

export interface LaniaCommandMetadata {
    actor: LaniaCommandActionInterface;
    commandNeededArgs: CommandNeededArgsInterface;
    // subcommands?: (new (...args: any[]) => LaniaCommand)[];
    subcommands?: any[];
}

export type ProgressInfo = {
    group: string;
    completed: number;
    total: number;
    percent: number;
    failed?: boolean;
    failMessage?: string;
};

export type ProgressCallback = (info: ProgressInfo) => void;


export type ProgressManagerConfig = { type: 'spinner' | 'bar' };

// 限制对外只暴露当前分组的方法（TS提示报错），禁止访问 completeAll 等全局方法
export type ScopedManager = {
    increment(amount?: number): void;
    set(completed: number): void;
    complete(): void;
    fail(message?: string): void;
    getProgress(): ProgressInfo | null;
    updateTotal: (total: number) => void;
    init: (total?: number) => void;
};