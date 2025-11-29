import 'reflect-metadata';
import { Argv, CommandModule } from 'yargs';
import { logger } from '../logger';
import {
    CommandHook,
    CommandOption,
    CommandNeededArgsInterface,
    LaniaCommandActionInterface,
    LaniaCommandMetadata,
    YargsOption,
    LaniaCommandConfigInterface,
    ILaniaCommand
} from '@lania-cli/types';
import { LaniaAction } from './LaniaAction';
import { PluginManager } from './plugins-manager';
const camelCase = (input: string) => {
    return input.replace(/[-_]+(\w)/g, (_, c) => c.toUpperCase());
};
const inferTypeFromFlags = (flags: string, defaultValue: any): YargsOption['type'] => {
    if (flags.includes('<number>')) return 'number';
    if (flags.includes('<string>') || flags.includes('[')) return 'string';
    if (flags.includes('<')) return 'string';
    if (typeof defaultValue === 'number') return 'number';
    if (typeof defaultValue === 'boolean') return 'boolean';
    if (!flags.match(/<.+>|\[.+\]/)) {
        return 'boolean';
    }
    return 'string';
};
const extractFlags = (flags: string) => {
    let short: string | undefined;
    let long: string | undefined;
    let isNegated = false;
    const flagParts = flags.split(',').map(s => s.trim()).filter(s => s.length > 0);
    for (const part of flagParts) {
        if (part.startsWith('--no-')) {
            const nameMatch = part.match(/^--no-([a-zA-Z][\w-]*)/);
            if (nameMatch) {
                long = nameMatch[1];
                isNegated = true;
            }
        } else if (part.startsWith('--')) {
            const nameMatch = part.match(/^--([a-zA-Z][\w-]*)/);
            if (nameMatch) {
                long = nameMatch[1];
            }
        } else if (part.startsWith('-') && part.length === 2) {
            short = part[1];
        }
    }
    if (!long) {
        throw new Error(`Invalid flags format: "${flags}", no valid long flag found.`);
    }
    const valueRequired = /<.+>|\[.+\]/.test(flags);
    return { long, short, isNegated, valueRequired };
};
const commanderToYargsOption = (option: CommandOption) => {
    const { flags, description, defaultValue, parser, choices } = option;
    const { long, short, isNegated, valueRequired } = extractFlags(flags);
    const key = long;
    let type: YargsOption['type'] = inferTypeFromFlags(flags, defaultValue);
    const isSwitch = !valueRequired && !isNegated;
    if (isSwitch) {
        type = 'boolean';
    }
    const config: YargsOption = {
        describe: description,
        alias: short,
        default: defaultValue,
        type: type,
        choices,
    };
    if (isNegated) {
        config.type = 'boolean';
    }
    if (parser) {
        config.coerce = parser;
    }
    if (valueRequired && !isNegated && flags.includes('<')) {
        config.demandOption = true;
    }
    return { key, config } as { key: string; config: YargsOption };
};

export abstract class LaniaCommand<ActionArgs extends any[] = any[]> implements ILaniaCommand {
    protected config: LaniaCommandConfigInterface<ActionArgs>;
    private legacyHooks: {
        beforeExecute?: CommandHook;
        afterExecute?: CommandHook;
        onError?: CommandHook;
    } = {};

    private parentCommand?: LaniaCommandConfigInterface['parent'];
    private actor?: LaniaCommandActionInterface<ActionArgs>;
    private commandNeededArgs?: CommandNeededArgsInterface;
    private subcommands?: LaniaCommandConfigInterface['subcommands'];

    constructor(
        config: LaniaCommandConfigInterface<ActionArgs> = {} as LaniaCommandConfigInterface,
    ) {
        this.parentCommand = config.parent;
        this.actor = config.actor;
        this.legacyHooks = config.hooks ?? {};
        this.commandNeededArgs = config.commandNeededArgs;
        this.subcommands = config.subcommands;
        this.config = config;
    }
    public load(): CommandModule {
        const actor = this.actor as LaniaAction;
        const commandNeededArgs = this.commandNeededArgs;
        const subcommands = this.subcommands;
        if (!actor || !commandNeededArgs) {
            const constructor = this.constructor as any;
            const meta: LaniaCommandMetadata | undefined = Reflect.getMetadata(
                constructor,
                constructor,
            );
            if (!meta || !meta.actor || !meta.commandNeededArgs) {
                throw new Error(
                    `Command metadata (actor/args) not found for ${this.constructor.name}`,
                );
            }
            return this._buildCommandModule(meta.actor as LaniaAction, meta.commandNeededArgs, meta.subcommands);
        }
        return this._buildCommandModule(actor, commandNeededArgs, subcommands);
    }

    private _buildCommandModule(
        actor: LaniaAction<ActionArgs>,
        commandNeededArgs: CommandNeededArgsInterface,
        subcommands?: LaniaCommandConfigInterface['subcommands'],
    ): CommandModule {
        const {
            name,
            description,
            options = [],
            alias,
            examples,
            args,
            overrideNoPrefixParsing: commandOverrideNoPrefixParsing,
        } = commandNeededArgs;
        actor?.initialize?.(this.config, new PluginManager());
        const builder = (yargs: Argv) => {
            this.registerOptions(yargs, options);
            subcommands?.forEach((subInstance) => {
                yargs.command(subInstance.load());
            });
            examples?.forEach((ex) => {
                yargs.example(ex, '');
            });
            return yargs;
        };
        const handler = async (argv: any) => {
            try {
                // 1. 保持原有 reducedArgv 逻辑 (用于处理 --no-prefix)
                const reducedArgv = options?.reduce((acc: Record<string, any>, option) => {
                    const match = option.flags.match(/--(?:no-)?([a-zA-Z][\w-]*)/);
                    const rawKey = match?.[1];
                    if (!rawKey) return acc;
                    const isNo = option.flags.startsWith('--no-');
                    const overrideNoPrefixParsing =
                        option.overrideNoPrefixParsing ?? commandOverrideNoPrefixParsing;
                    if (overrideNoPrefixParsing && isNo) {
                        const rawCameKey = camelCase(rawKey);
                        const key = `no-${rawKey}`;
                        const cameKey = camelCase(key);
                        acc[cameKey] = !(acc[rawCameKey] ?? acc[rawKey]);
                        acc[rawKey] = acc[cameKey];
                        acc[key] = acc[cameKey];
                    }
                    return acc;
                }, argv);
                await this.legacyHooks.beforeExecute?.();
                await actor.handle(...([reducedArgv] as ActionArgs));
                await this.legacyHooks.afterExecute?.();
            } catch (err) {
                await this.legacyHooks.onError?.();
                logger.error(err instanceof Error ? err.stack : String(err));
                process.exit(1);
            }
        };

        return {
            command: args?.length ? `${name} ${args.join(' ')}` : name,
            describe: description,
            aliases: alias ? [alias] : [],
            builder: builder,
            handler: handler,
        };
    }

    private registerOptions(yargs: Argv, options?: CommandOption[]) {
        options?.forEach((option) => {
            const { key, config } = commanderToYargsOption(option);
            yargs.option(key, config);
        });
    }

    // 保持原有对外 API
    public addHook(type: keyof typeof this.legacyHooks, fn: CommandHook) {
        this.legacyHooks[type] = fn;
    }

    public getParent(): LaniaCommandConfigInterface['parent'] | undefined {
        return this.parentCommand;
    }
}
