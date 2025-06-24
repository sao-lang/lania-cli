import { CliOptions, Question } from '@lania-cli/types';
import { Answer, Context } from '@lania-cli/types';
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

export class CliInteraction<TCtx extends Context = Context> {
    private questions: Question<TCtx>[] = [];
    private options: CliOptions<TCtx>;
    private context: TCtx;

    constructor(options?: CliOptions<TCtx>) {
        this.options = options || {};
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

    public async execute(): Promise<Answer> {
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
                logger.log('用户中止流程');
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
                    logger.warn(`无法跳转，未找到问题: ${goto}`);
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
                logger.warn(`\n超时跳过，使用默认值: ${question.default}`);
                resolve({ [question.name]: resolve(question.default) });
            }, timeoutSec * 1000);
        });

        return Promise.race([prompt, timeout]);
    }
}

export const simplePromptInteraction = async (questions: Question[] | Question) => {
    return await new CliInteraction()
        .addQuestions(Array.isArray(questions) ? questions : [questions])
        .execute();
};
