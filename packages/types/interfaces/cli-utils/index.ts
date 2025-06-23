import { CommandNeededArgsInterface, LaniaCommandActionInterface } from '../commands/command.base';

import { Question as InquirerQuestion } from 'inquirer';
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

export type QuestionType = 'input' | 'confirm' | 'list' | 'expand' | 'password' | 'editor';
export type Answer = Record<string, any>;
export type Context = Record<string, any>;

export interface Question<TCtx extends Context = Context>
    extends Omit<InquirerQuestion, 'type' | 'validate' | 'default' | 'when' | 'message'> {
    type: QuestionType;
    returnable?: boolean;
    timeout?: number;
    choices?: (
        | {
              name: string;
              value: string;
          }
        | string
    )[];
    validate?: (
        input: any,
        answers: Answer,
        context: TCtx,
    ) => Promise<boolean | string> | boolean | string;
    goto?: string | ((answers: Answer, ctx: TCtx) => string | undefined);
    when?: boolean | ((answers: Answer, ctx: TCtx) => boolean);
    default?: any | ((answers: Answer, ctx: TCtx) => any);
    message?: string | ((answers: Answer, ctx: TCtx) => string);
}

export interface CliOptions<TCtx extends Context = Context> {
    context?: TCtx;
    debug?: boolean;
    i18n?: Record<string, string>;
    mapFunction?: (data: Answer, ctx: TCtx) => any;
    onAnswered?: (
        question: Question<TCtx>,
        value: any,
        answers: Answer,
        context: TCtx,
        cli: any,
    ) => void;
}
