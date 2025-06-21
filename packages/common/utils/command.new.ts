import 'reflect-metadata';
import yargs, { Argv, CommandModule } from 'yargs';
import { logger } from './logger'; // 替换为你的 logger 实现
import {
    CommandHook,
    CommandOption,
    CommandNeededArgsInterface,
    LaniaCommandActionInterface,
    LaniaCommandMetadata,
    YargsOption,
} from '@lania-cli/types';
import { hideBin } from 'yargs/helpers';

const camelCase = (input: string) => {
    return input.toLowerCase().replace(/[-_]+(\w)/g, (_, c) => c.toUpperCase());
};
const commanderToYargsOption = (option: CommandOption) => {
    const { flags, description, defaultValue, parser, choices } = option;

    const parts = flags.split(',').map((s: any) => s.trim());
    let short: string | undefined;
    let long: string | undefined;
    let valueRequired = false;
    let isNegated = false;

    for (const part of parts) {
        if (part.startsWith('--no-')) {
            long = part.slice(5); // 去掉 "--no-"
            isNegated = true;
        } else if (part.startsWith('--')) {
            long = part
                .slice(2)
                .replace(/(<.+?>|\[.+?\])/g, '')
                .trim(); // 去掉参数标记
            valueRequired = /<.+>/.test(part);
        } else if (part.startsWith('-') && part.length === 2) {
            short = part[1];
        }
    }

    if (!long) {
        throw new Error(`Invalid flags format: "${flags}", no long flag found.`);
    }

    const key = long;

    const config: YargsOption = {
        describe: description,
        alias: short,
        default: isNegated ? true : defaultValue,
        type: inferTypeFromFlags(flags, defaultValue),
        choices,
    };

    if (parser) config.coerce = parser;
    if (valueRequired) config.demandOption = true;
    if (isNegated) config.type = 'boolean';

    return { key, config } as { key: string; config: YargsOption };
};
const inferTypeFromFlags = (flags: string, defaultValue: any) => {
    if (flags.includes('<number>')) return 'number';
    if (typeof defaultValue === 'number') return 'number';
    if (flags.includes('<')) return 'string';
    if (typeof defaultValue === 'boolean') return 'boolean';
    return 'string';
};

export abstract class LaniaCommand<ActionArgs extends any[] = any[]> {
    protected hooks: {
        beforeExecute?: CommandHook;
        afterExecute?: CommandHook;
        onError?: CommandHook;
    } = {};

    private parentCommand?: LaniaCommand;

    // ✅ 子类可赋值
    protected actor?: LaniaCommandActionInterface<ActionArgs>;
    protected commandNeededArgs?: CommandNeededArgsInterface;
    protected subcommands?: LaniaCommand[];

    constructor(parent?: LaniaCommand) {
        this.parentCommand = parent;
    }

    public load(): CommandModule {
        const actor = this.actor;
        const commandNeededArgs = this.commandNeededArgs;
        const subcommands = this.subcommands;

        if (!actor || !commandNeededArgs) {
            const constructor = this.constructor as any;
            const meta: LaniaCommandMetadata | undefined = Reflect.getMetadata(
                constructor,
                constructor,
            );
            if (!meta) {
                throw new Error(`Command metadata not found for ${this.constructor.name}`);
            }

            return this._buildCommandModule(meta.actor, meta.commandNeededArgs, meta.subcommands);
        }

        return this._buildCommandModule(actor, commandNeededArgs, subcommands);
    }

    private _buildCommandModule(
        actor: LaniaCommandActionInterface<ActionArgs>,
        commandNeededArgs: CommandNeededArgsInterface,
        subcommands?: LaniaCommand[],
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
        return {
            command: args?.length ? `${name} ${args.join(' ')}` : name,
            describe: description,
            aliases: alias ? [alias] : [],
            builder: (yargs: Argv) => {
                this.registerOptions(yargs, options);
                subcommands?.forEach((subInstance) => {
                    yargs.command(subInstance.load());
                });
                examples?.forEach((ex) => {
                    yargs.example(ex, '');
                });
                return yargs;
            },
            handler: async (argv: any) => {
                try {
                    const reducedArgv = options?.reduce((acc, option) => {
                        const match = option.flags.match(/--(?:no-)?([a-zA-Z][\w-]*)/);
                        const rawKey = match?.[1];
                        if (!rawKey) return acc;
                        const isNo = option.flags.startsWith('--no-');
                        const overrideNoPrefixParsing =
                            option.overrideNoPrefixParsing ?? commandOverrideNoPrefixParsing;
                        const key = isNo ? `no-${rawKey}` : rawKey;
                        if (overrideNoPrefixParsing) {
                            const cameKey = camelCase(key);
                            if (isNo) {
                                acc[cameKey] = !acc[rawKey];
                                acc[rawKey] = acc[cameKey];
                                acc[key] = acc[cameKey];
                            }
                        }
                        return acc;
                    }, argv);
                    await this.hooks.beforeExecute?.();
                    await actor.handle(...([reducedArgv] as ActionArgs));
                    await this.hooks.afterExecute?.();
                } catch (err) {
                    await this.hooks.onError?.();
                    logger.error(err instanceof Error ? err.stack || err.message : String(err));
                    process.exit(1);
                }
            },
        };
    }

    private registerOptions(yargs: Argv, options?: CommandOption[]) {
        options?.forEach((option) => {
            const { key, config } = commanderToYargsOption(option);
            yargs.option(option.name ?? key, config);
        });
    }

    public addHook(type: keyof typeof this.hooks, fn: CommandHook) {
        this.hooks[type] = fn;
    }

    public getParent(): LaniaCommand | undefined {
        return this.parentCommand;
    }
}

// 注册入口函数，注册所有命令
export const registerCommands = (name: string, version: string, commands?: LaniaCommand[]) => {
    let cli = yargs(hideBin(process.argv))
        .scriptName(name)
        .version('version', version, '显示版本')
        .usage('<command> [options]')
        .help('help', '显示帮助信息')
        .alias('h', 'help')
        .alias('v', 'version')
        .showHelpOnFail(true, '(使用 --help 查看可用选项)');

    commands?.forEach((command) => {
        cli = cli.command(command.load());
    });

    cli.parseAsync().catch((e) => {
        logger.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
    });
};
