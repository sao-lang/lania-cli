import {
    CommandNeededArgsInterface,
    LaniaCommandActionInterface,
    LaniaCommandMetadata,
} from '@lania-cli/types';
import { LaniaCommand } from '../utils';

export function LaniaCommandConfig(
    actor: LaniaCommandActionInterface,
    commandNeededArgs: CommandNeededArgsInterface,
    subcommands: LaniaCommand[] = [],
): ClassDecorator {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return function (target: Function) {
        if (!actor || !commandNeededArgs?.name) {
            throw new Error('@LaniaCommandConfig requires actor and commandNeededArgs.name');
        }
        const metadata: LaniaCommandMetadata = { actor, commandNeededArgs, subcommands };
        Reflect.defineMetadata(target, metadata, target);
    };
}
