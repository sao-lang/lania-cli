import inquirer from 'inquirer';
import { Question as InquirerQuestion } from 'inquirer';

// ---------- 类型定义 ----------

export type QuestionType = 'input' | 'confirm' | 'list' | 'expand' | 'password' | 'editor';

export type Answer = Record<string, any>;
export type Context = Record<string, any>;

export interface Question<TCtx extends Context = Context>
    extends Omit<InquirerQuestion, 'type' | 'validate' | 'default' | 'when' | 'message'> {
    type: QuestionType;
    returnable?: boolean;
    timeout?: number;
    validate: (input: any, context: TCtx, answers: Answer) => Promise<boolean | string> | boolean | string;
    goto?: string | ((ctx: TCtx) => string | undefined);
    when?: boolean | ((ctx: TCtx) => boolean);
    default?: any | ((ctx: TCtx) => any);
    message?: string | ((ctx: TCtx) => string);
}

export type QuestionGroup<TCtx extends Context = Context> = {
    name: string;
    questions: Question<TCtx>[];
};

export type CLIUnit<TCtx extends Context = Context> = Question<TCtx> | QuestionGroup<TCtx>;

export interface MiddlewareContext<TCtx extends Context = Context> {
    question: Question<TCtx>;
    context: TCtx;
    answers: Answer;
    cli: CLIInteraction<TCtx>;
}

export type MiddlewareFn<TCtx extends Context = Context> = (
    ctx: MiddlewareContext<TCtx>,
    next: () => Promise<void>
) => Promise<void>;

export interface CLIOptions<TCtx extends Context = Context> {
    mapFunction?: (data: Answer, context: TCtx) => Record<string, any>;
    onAnswered?: (
        question: Question<TCtx>,
        value: any,
        answers: Answer,
        context: TCtx,
        cli: CLIInteraction<TCtx>
    ) => void;
    context?: TCtx;
    debug?: boolean;
}

export interface CLIPlugin<TCtx extends Context = Context> {
    name?: string;
    setup: (cli: CLIInteraction<TCtx>) => void;
}

// ---------- 工具函数 ----------

function resolveDynamic<T, C extends Context>(value: T | ((ctx: C) => T), context: C): T {
    return typeof value === 'function' ? (value as (ctx: C) => T)(context) : value;
}

export const BACK_SIGNAL = '__BACK__';
export const EXIT_SIGNAL = '__EXIT__';

// ---------- 主类实现 ----------

export class CLIInteraction<TCtx extends Context = Context> {
    private questions: Question<TCtx>[] = [];
    private options: CLIOptions<TCtx>;
    private context: TCtx;
    private middlewares: MiddlewareFn<TCtx>[] = [];

    constructor(options?: CLIOptions<TCtx>) {
        this.options = options || {};
        this.context = this.options.context || ({} as TCtx);
    }

    getContext(): TCtx {
        return this.context;
    }

    updateContext(ctx: Partial<TCtx>): void {
        this.context = { ...this.context, ...ctx };
    }

    useMiddleware(middleware: MiddlewareFn<TCtx>): this {
        this.middlewares.push(middleware);
        return this;
    }

    addQuestion(question: Question<TCtx>): this {
        this.questions.push(question);
        return this;
    }

    addQuestions(questions: Question<TCtx>[]): this {
        questions.forEach((q) => this.addQuestion(q));
        return this;
    }

    insertQuestions(questions: Question<TCtx>[], options: { after?: string; before?: string }): void {
        let index = 0;
        if (options.after) {
            index = this.questions.findIndex((q) => q.name === options.after) + 1;
        } else if (options.before) {
            index = this.questions.findIndex((q) => q.name === options.before);
        }
        if (index >= 0) {
            this.questions.splice(index, 0, ...questions);
        }
    }

    setMapFunction(fn: CLIOptions<TCtx>['mapFunction']): this {
        this.options.mapFunction = fn;
        return this;
    }

    private async runMiddlewares(ctx: MiddlewareContext<TCtx>): Promise<Question<TCtx>> {
        let index = -1;

        const dispatch = async (i: number): Promise<void> => {
            if (i <= index) throw new Error('Middleware called multiple times');
            index = i;
            const fn = this.middlewares[i];
            if (fn) {
                await fn(ctx, () => dispatch(i + 1));
            }
        };

        await dispatch(0);
        return ctx.question;
    }

    async execute(): Promise<Answer> {
        let currentStep = 0;
        const answers: Answer = {};

        while (currentStep < this.questions.length) {
            let question = this.questions[currentStep];
            const ctx = { ...answers, ...this.context } as TCtx;

            const shouldAsk = resolveDynamic(question.when ?? true, ctx);
            if (!shouldAsk) {
                currentStep++;
                continue;
            }

            const mwCtx: MiddlewareContext<TCtx> = {
                question,
                context: ctx,
                answers,
                cli: this,
            };
            question = await this.runMiddlewares(mwCtx);

            const qResolved = {
                ...question,
                message: resolveDynamic(question.message, ctx),
                default: resolveDynamic(question.default, ctx),
            };

            try {
                const answer = await this.promptWithTimeout(qResolved as Question<TCtx>, question.timeout);
                const value = answer[question.name];

                if (value === EXIT_SIGNAL) {
                    console.log('用户中止流程');
                    return answers;
                }
                if (value === BACK_SIGNAL && question.returnable && currentStep > 0) {
                    currentStep--;
                    continue;
                }

                answers[question.name] = value;

                if (this.options.onAnswered) {
                    this.options.onAnswered(question, value, answers, this.context, this);
                }

                if (this.options.debug) {
                    console.debug(`[${question.name}] =>`, value);
                }

                const goto = resolveDynamic(question.goto, ctx);
                if (goto) {
                    const targetIndex = this.questions.findIndex((q) => q.name === goto);
                    if (targetIndex !== -1) {
                        currentStep = targetIndex;
                        continue;
                    } else if (this.options.debug) {
                        console.warn(`无法跳转，未找到问题: ${goto}`);
                    }
                }

                currentStep++;
            } catch (err: any) {
                if (question.returnable && currentStep > 0) {
                    console.error(`输入错误: ${err.message}`);
                    currentStep--;
                } else {
                    throw err;
                }
            }
        }

        return this.options.mapFunction ? this.options.mapFunction(answers, this.context) : answers;
    }

    private promptWithTimeout(question: Question<TCtx>, timeoutSec?: number): Promise<Answer> {
        const prompt = inquirer.prompt([
            {
                ...question,
                validate: async (input: any) => {
                    if (input === BACK_SIGNAL || input === EXIT_SIGNAL) return true;
                    if (!question.validate) return true;
                    try {
                        const result = question.validate(input, this.context, {});
                        return result instanceof Promise ? await result : result;
                    } catch (e) {
                        return (e as Error).message || '验证失败';
                    }
                },
            },
        ] as any);

        if (!timeoutSec) return prompt;

        const timeout = new Promise<Answer>((resolve) => {
            setTimeout(() => {
                console.warn(`\n超时跳过，使用默认值: ${question.default}`);
                resolve({ [question.name]: resolveDynamic(question.default, this.context) });
            }, timeoutSec * 1000);
        });

        return Promise.race([prompt, timeout]);
    }
}

// ---------- 插件示例 ----------

export const i18nPlugin = <TCtx extends Context = Context>(
    translations: Record<string, any>,
    lang = 'zh'
): CLIPlugin<TCtx> => ({
    name: 'i18n',
    setup(cli) {
        cli.useMiddleware(async (ctx, next) => {
            if (typeof ctx.question.message === 'string') {
                ctx.question.message =
                    translations[lang]?.[ctx.question.message] || ctx.question.message;
            }
            await next();
        });
    },
});

export const contextPlugin = <TCtx extends Context = Context>(
    extra: Partial<TCtx>
): CLIPlugin<TCtx> => ({
    name: 'ctx-inject',
    setup(cli) {
        let injected = false;

        cli.useMiddleware(async (ctx, next) => {
            if (!injected) {
                cli.updateContext(extra);
                injected = true;
            }
            await next();
        });
    },
});