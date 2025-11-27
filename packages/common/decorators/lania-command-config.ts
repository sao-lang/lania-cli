import 'reflect-metadata'; // 引入 reflect-metadata 库

import {
    CommandNeededArgsInterface,
    LaniaCommandActionInterface,
    LaniaCommandMetadata,
} from '@lania-cli/types';
import { LaniaCommand } from '../lib';

// 定义一个更精确的类型来表示 LaniaCommand 的构造函数（Class）
type LaniaCommandConstructor = {
    new (...args: any[]): LaniaCommand;
};

/**
 * LaniaCommandConfig 装饰器工厂
 * 用于将元数据附加到 LaniaCommand 类上。
 * @param actor - 命令的执行动作接口。
 * @param commandNeededArgs - 命令的必需参数配置。
 * @param subcommands - 可选的子命令数组。
 * @returns ClassDecorator - 实际的类装饰器函数。
 */
export function LaniaCommandConfig(
    actor: LaniaCommandActionInterface,
    commandNeededArgs: CommandNeededArgsInterface,
    subcommands: LaniaCommand[] = [],
): ClassDecorator {
    // 实际的装饰器函数，使用 LaniaCommandConstructor 类型确保类型安全
    // @ts-ignore
    return function (target: LaniaCommandConstructor) {
        // 1. 明确的参数校验
        if (!actor || !commandNeededArgs?.name) {
            throw new Error('@LaniaCommandConfig requires actor and commandNeededArgs.name');
        }

        // 2. 构造元数据对象，确保类型兼容性（假定 LaniaCommandMetadata 匹配此结构）
        const metadata: LaniaCommandMetadata = {
            actor,
            commandNeededArgs,
            // @ts-ignore
            subcommands,
        };

        // 3. 使用 Reflect API 附加元数据
        // key 和 target 都使用 target (构造函数)
        Reflect.defineMetadata(target, metadata, target);
    };
}
