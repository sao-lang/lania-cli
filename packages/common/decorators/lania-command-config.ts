
import { CommandNeededArgsInterface } from '@lania-cli/types';
import { LaniaCommand, LaniaCommandMetadata } from '../utils';

// 定义元数据 key
export const META_COMMAND_CONFIG = Symbol('lania:command_config');
export function LaniaCommandConfig(
    actor: new (...args: any[]) => any,
    commandNeededArgs: CommandNeededArgsInterface,
    subcommands: (new (...args: any[]) => LaniaCommand)[] = [],
): ClassDecorator {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return function (target: Function) {
        if (!actor || !commandNeededArgs?.name) {
            throw new Error('@LaniaCommandConfig requires actor and commandNeededArgs.name');
        }
        const metadata: LaniaCommandMetadata = { actor, commandNeededArgs, subcommands };
        Reflect.defineMetadata(META_COMMAND_CONFIG, metadata, target);
    };
}
