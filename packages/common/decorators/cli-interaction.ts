// --- 1. Imports ---
import 'reflect-metadata';
import type { Question, Answer } from '@lania-cli/types';
import { CliInteraction } from '../lib';

// --- 2. Type Aliases ---
/**
 * 定义一个类型，可以是 T 本身 (如 Question[]), 也可以是返回 T 或 Promise<T> 的函数。
 */
type MaybeFunc<T> = T | (() => T | Promise<T>);

// --- 3. Internal Caching Mechanism ---
// 使用 WeakMap 安全地存储每个实例的缓存 Promise，避免原型污染
const promiseCache = new WeakMap<any, Promise<Answer>>();

// --- 4. Decorator Factory Definition ---
/**
 * @PromptAnswers 装饰器 (MethodDecorator)
 * * 将被装饰的方法转换为一个异步命令执行器。
 * 只有显式调用该方法时，才会执行 CLI 交互，并缓存结果 Promise。
 *
 * @param questions - 问题数组，可以是数组本身，也可以是返回数组的同步/异步函数。
 */
export function PromptAnswers(questions: MaybeFunc<Question[]>): MethodDecorator {
    // --- 5. Decorator Function ---
    return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        // 覆盖原始方法 (descriptor.value)
        descriptor.value = function (this: any): Promise<Answer> {
            // 5.1. 缓存检查
            if (promiseCache.has(this)) {
                return promiseCache.get(this)!;
            }

            // 5.2. 创建和执行异步交互逻辑
            const promptPromise = (async (): Promise<Answer> => {
                try {
                    // 解析 questions 参数
                    const qs = typeof questions === 'function' ? await questions() : questions;

                    const cli = new CliInteraction();
                    cli.addQuestions(qs);

                    // 强制等待 CLI 交互完成
                    const answers = await cli.execute();
                    return answers;
                } catch (error) {
                    console.error(`Error executing prompt for ${String(propertyKey)}:`, error);
                    throw error;
                }
            })();

            // 5.3. 缓存 Promise 并返回
            promiseCache.set(this, promptPromise);
            return promptPromise;
        };

        // --- 6. Return Modified Descriptor ---
        return descriptor;
    };
}
