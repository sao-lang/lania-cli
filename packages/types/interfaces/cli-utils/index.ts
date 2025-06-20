import { CommandNeededArgsInterface } from '../commands/command.base';

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
    actor: new (...args: any[]) => any;
    commandNeededArgs: CommandNeededArgsInterface;
    // subcommands?: (new (...args: any[]) => LaniaCommand)[];
    subcommands?: any[];
}
