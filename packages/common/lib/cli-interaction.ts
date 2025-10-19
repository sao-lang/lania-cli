import { CliOptions, Question, Answer, Context } from '@lania-cli/types';
import inquirer from 'inquirer';
import { logger } from './logger';

function resolve<T, C extends Context>(
    value: T | ((answers: Answer, ctx: C) => T),
    answers: Answer,
    ctx: C,
): T {
    return typeof value === 'function'
        ? (value as (answers: Answer, ctx: C) => T)(answers, ctx)
        : value;
}

const BACK_SIGNAL = '__BACK__';
const EXIT_SIGNAL = '__EXIT__';

interface ExtendedCliOptions<TCtx extends Context = Context> extends CliOptions<TCtx> {
    accumulation?: {
        /** 是否开启多次 execute 结果累积（默认 true） */
        accumulate?: boolean;
        /** 如果开启累积，用于合并上一次与本次答案的策略（默认浅合并：current 覆盖 previous） */
        mergeStrategy?: (previous: Answer, current: Answer) => Answer;
        /** 每次 execute 之前是否先清空历史（如果为 true，等于每次都是干净的一轮） */
        resetOnExecute?: boolean;
    };
}

export class CliInteraction<TCtx extends Context = Context> {
    private questions: Question<TCtx>[] = [];
    private options: ExtendedCliOptions<TCtx>;
    private context: TCtx;
    // 原始历史答案（不受 mapFunction 变形影响）
    private previousAnswers: Answer = {};

    constructor(options?: ExtendedCliOptions<TCtx>) {
        this.options = options || ({} as ExtendedCliOptions<TCtx>);
        this.context = this.options.context || ({} as TCtx);
    }

    public addQuestion(q: Question<TCtx>): this {
        this.questions.push(q);
        return this;
    }

    public addQuestions(qs: Question<TCtx>[]): this {
        this.questions.push(...qs);
        return this;
    }

    public insertQuestions(
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

    public updateContext(ctx: Partial<TCtx>): void {
        this.context = { ...this.context, ...ctx };
    }

    /**
     * 显式重置累积的历史答案（下一次 execute 将从干净状态开始，除非 resetOnExecute 是 false 且 accumulate 是 false）
     */
    public resetAccumulated(): void {
        this.previousAnswers = {};
    }

    private shouldAccumulate(): boolean {
        return this.options.accumulation?.accumulate !== false;
    }

    private getMergeStrategy(): (previous: Answer, current: Answer) => Answer {
        return (
            this.options.accumulation?.mergeStrategy ||
            ((previous: Answer, current: Answer) => ({ ...previous, ...current }))
        );
    }

    public async execute(): Promise<Answer> {
        // 如果配置了每次 execute 先 reset，就清空历史
        if (this.options.accumulation?.resetOnExecute) {
            this.previousAnswers = {};
        }

        // 依据 accumulate 决定起点
        const baseAnswers: Answer = this.shouldAccumulate() ? { ...this.previousAnswers } : {};
        const answers: Answer = { ...baseAnswers };

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
                logger.log('用户中止流程');
                if (this.shouldAccumulate()) {
                    this.previousAnswers = this.getMergeStrategy()(this.previousAnswers, answers);
                }
                return this.options.mapFunction
                    ? this.options.mapFunction(answers, this.context)
                    : answers;
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
                    logger.warn(`无法跳转，未找到问题: ${goto}`);
                }
            }

            step++;
        }

        const finalAns = this.options.mapFunction
            ? this.options.mapFunction(answers, this.context)
            : answers;

        if (this.shouldAccumulate()) {
            this.previousAnswers = this.getMergeStrategy()(this.previousAnswers, answers);
        }

        return finalAns;
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
                logger.warn(`\n超时跳过，使用默认值: ${question.default}`);
                // 动态解析 default
                let defVal: any;
                try {
                    defVal =
                        question.default !== undefined
                            ? typeof question.default === 'function'
                                ? (question.default as any)(answers, this.context)
                                : question.default
                            : undefined;
                } catch {
                    defVal = undefined;
                }
                resolve({ [question.name]: defVal });
            }, timeoutSec * 1000);
        });

        return Promise.race([prompt, timeout]);
    }
}
