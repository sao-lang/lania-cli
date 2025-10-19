import type { Question } from '@lania-cli/types';
import type { Answer } from '@lania-cli/types';
import { CliInteraction } from '../lib';

type MaybeFunc<T> = T | (() => T | Promise<T>);

/**
 * @PromptAnswers 装饰器
 * 通过 Proxy 实现自动触发交互和缓存回答
 */
export function PromptAnswers(questions: MaybeFunc<Question[]>): PropertyDecorator {
    return (target: any, propertyKey: string | symbol) => {
        let cachedProxy: Answer | null = null;
        let resolved = false;

        const handler = {
            get(_: any, key: string) {
                // 返回 Proxy 时第一次访问触发执行
                if (!resolved) {
                    resolved = true;

                    (async () => {
                        const qs = typeof questions === 'function' ? await questions() : questions;
                        const cli = new CliInteraction();
                        cli.addQuestions(qs);
                        const answers = await cli.execute();
                        cachedProxy = answers;
                    })();
                }

                // 返回代理访问属性（注意：第一次访问异步未完成时返回 undefined）
                return cachedProxy?.[key];
            },

            // 支持解构、Object.keys 等操作
            ownKeys() {
                return cachedProxy ? Reflect.ownKeys(cachedProxy) : [];
            },

            getOwnPropertyDescriptor(_: any, prop: string) {
                return {
                    configurable: true,
                    enumerable: true,
                    value: cachedProxy?.[prop],
                };
            },
        };

        const proxy = new Proxy({}, handler);

        // 通过原始 class prototype 注入 proxy
        if (!target.__promptAnswerProxies) target.__promptAnswerProxies = {};
        target.__promptAnswerProxies[propertyKey] = proxy;

        // 设置属性访问代理
        Object.defineProperty(target, propertyKey, {
            get() {
                return target.__promptAnswerProxies[propertyKey];
            },
            enumerable: true,
            configurable: true,
        });
    };
}
