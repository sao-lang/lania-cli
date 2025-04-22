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

export interface CLIOptions<TCtx extends Context = Context> {
    context?: TCtx;
    debug?: boolean;
    i18n?: Record<string, string>;
    mapFunction?: (data: Answer, ctx: TCtx) => any;
    onAnswered?: (
        question: Question<TCtx>,
        value: any,
        answers: Answer,
        context: TCtx,
        cli: CLIInteraction<TCtx>,
    ) => void;
}

// ---------- 工具函数 ----------

function resolve<T, C extends Context>(
    value: T | ((answers: Answer, ctx: C) => T),
    answers: Answer,
    ctx: C,
): T {
    return typeof value === 'function'
        ? (value as (answers: Answer, ctx: C) => T)(answers, ctx)
        : value;
}

export const BACK_SIGNAL = '__BACK__';
export const EXIT_SIGNAL = '__EXIT__';

// ---------- 主类实现 ----------

export class CLIInteraction<TCtx extends Context = Context> {
    private questions: Question<TCtx>[] = [];
    private options: CLIOptions<TCtx>;
    private context: TCtx;

    constructor(options?: CLIOptions<TCtx>) {
        this.options = options || {};
        this.context = this.options.context || ({} as TCtx);
    }

    addQuestion(q: Question<TCtx>): this {
        this.questions.push(q);
        return this;
    }

    addQuestions(qs: Question<TCtx>[]): this {
        this.questions.push(...qs);
        return this;
    }

    insertQuestions(
        questions: Question<TCtx>[],
        options: { after?: string; before?: string },
    ): void {
        let index = 0;
        if (options.after) {
            index = this.questions.findIndex((q) => q.name === options.after) + 1;
        } else if (options.before) {
            index = this.questions.findIndex((q) => q.name === options.before);
        }

        if (index < 0) {
            throw new Error('指定插入位置的问题未找到');
        }

        this.questions.splice(index, 0, ...questions);
    }

    updateContext(ctx: Partial<TCtx>): void {
        this.context = { ...this.context, ...ctx };
    }

    async execute(): Promise<Answer> {
        const answers: Answer = {};
        let step = 0;

        while (step < this.questions.length) {
            const q = this.questions[step];

            const shouldAsk = resolve(q.when ?? true, answers, this.context);
            if (!shouldAsk) {
                step++;
                continue;
            }

            const message = resolve(q.message ?? q.name, answers, this.context);
            const def = resolve(q.default, answers, this.context);

            const qResolved = {
                ...q,
                message: this.translate(message),
                default: def,
            };

            const result = await this.promptWithTimeout(qResolved, q.timeout, answers);
            const value = result[q.name];

            if (value === EXIT_SIGNAL) {
                console.log('用户中止流程');
                return answers;
            }

            if (value === BACK_SIGNAL && q.returnable && step > 0) {
                step--;
                continue;
            }

            answers[q.name] = value;

            this.options.onAnswered?.(q, value, answers, this.context, this);

            if (this.options.debug) {
                console.debug(`[${q.name}] =>`, value);
            }

            const goto = resolve(q.goto, answers, this.context);
            if (goto) {
                const targetIdx = this.questions.findIndex((q) => q.name === goto);
                if (targetIdx !== -1) {
                    step = targetIdx;
                    continue;
                } else if (this.options.debug) {
                    console.warn(`无法跳转，未找到问题: ${goto}`);
                }
            }

            step++;
        }

        return this.options.mapFunction ? this.options.mapFunction(answers, this.context) : answers;
    }

    private translate(text: string): string {
        return this.options.i18n?.[text] || text;
    }

    private promptWithTimeout(
        question: Question<TCtx>,
        timeoutSec: number | undefined,
        answers: Answer,
    ): Promise<Answer> {
        const prompt = inquirer.prompt([
            {
                ...question,
                validate: async (input: any) => {
                    if (input === BACK_SIGNAL || input === EXIT_SIGNAL) return true;
                    if (!question.validate) return true;
                    try {
                        const result = question.validate(input, answers, this.context);
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
                resolve({ [question.name]: resolve(question.default) });
            }, timeoutSec * 1000);
        });

        return Promise.race([prompt, timeout]);
    }
}
