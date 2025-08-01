import {
    BuildToolEnum,
    CssProcessorEnum,
    CssToolEnum,
    DocFrameEnum,
    FrameEnum,
    HttpToolEnum,
    LangEnum,
    LintToolEnum,
    OrmToolEnum,
    PackageManagerEnum,
    ProjectTypeEnum,
    RouterManagementToolEnum,
    StoreManagementToolEnum,
    UnitTestFrameEnum,
} from '../../enum';

import { CommandNeededArgsInterface, LaniaCommandActionInterface } from '../commands';

import { Question as InquirerQuestion } from 'inquirer';
export type ConfigurationLoadType =
    | 'npm'
    | 'pnpm'
    | 'yarn'
    | 'prettier'
    | 'package'
    | 'eslint'
    | 'stylelint'
    | 'commitlint'
    | 'markdownlint'
    | 'tsc'
    | 'editorconfig'
    | 'webpack'
    | 'vite'
    | 'gulp'
    | 'rollup';

export type ModuleName = ConfigurationLoadType | { module: string; searchPlaces?: string[] };

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

export interface InteractionConfig {
    name: string;
    type: ProjectTypeEnum;
    frame: FrameEnum;
    cssProcessor?: CssProcessorEnum;
    lintTools?: LintToolEnum[];
    packageManager: PackageManagerEnum;
    buildTools: BuildToolEnum[] | BuildToolEnum;
    docFrame?: DocFrameEnum;
    useUnitTest: boolean;
    unitTestTool?: UnitTestFrameEnum;
    useLintTools: boolean;
    useCssProcessor: boolean;
    useTs: boolean;
    useDocFrame: boolean;
    repository: string;
    initRepository: boolean;
    useRouterTool: boolean;
    routerTool?: RouterManagementToolEnum;
    useStoreTool: boolean;
    storeTool?: StoreManagementToolEnum;
    useServiceTool: boolean;
    serviceTool?: HttpToolEnum;
    useORMTool: boolean;
    ormTool?: OrmToolEnum;
    directory?: string;
    port?: number | string;
    language?: LangEnum;
    buildTool: BuildToolEnum;
    cssTools?: CssToolEnum[];
    linters?: LintToolEnum[];
    projectType?: string;
}

export interface LaniaConfig {
    name?: string; // 项目名称
    type?: ProjectTypeEnum; // 项目类型：应用 / 库
    language: LangEnum; // 编程语言
    frame: FrameEnum; // 框架类型
    linterTools?: LintToolEnum;
    cssProcessor: CssProcessorEnum; // 主样式方案
    cssTools?: CssToolEnum[]; // 额外的 CSS 工具（如 autoprefixer、postcss-preset-env）
    buildTool?: BuildToolEnum; // 构建工具
    packageManager?: PackageManagerEnum; // 包管理器
    commands?: Record<string, string>; // 用户自定义命令，key 是别名，value 是实际命令
    docFrame?: DocFrameEnum;
    unitTestFrame?: UnitTestFrameEnum[];
    hooks?: {
        onInit?: string | string[]; // 初始化时执行的脚本或命令
        onBuild?: string | string[]; // 构建前/后执行
        onRelease?: string | string[]; // 发布前/后执行
        [hookName: string]: string | string[] | undefined; // 支持自定义 hook
    };
    custom?: Record<string, any>; // 用户扩展字段（为了未来兼容）
    linters?: LintToolEnum[];
}

export interface RunnerRunOptions {
    silent?: boolean;
    cwd?: string;
}


export type CommitlintConfigSource = string | Record<string, any>;

export interface CommitlintPluginConfig {
    config?: CommitlintConfigSource;
}

export interface PackageManagerCommandFlags {
    saveFlag: string;
    saveDevFlag: string;
    silentFlag: string;
    initFlag: string;
}

export interface PackageManagerCommands {
    install: string;
    add: string;
    update: string;
    remove: string;
    init: string;
}

export type PackageManagerName = 'npm' | 'yarn' | 'pnpm';
