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
    // 移除所有 Hooks 和 Plugin 相关的类型导入
} from '@lania-cli/types';

// 移除所有 Hooks 和 Plugin 相关的导入
// import { createHook, PluginManager } from './command-plugins-manager';

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

const commanderToYargsOption = (option: CommandOption) => {
    const { flags, description, defaultValue, parser, choices } = option;
    const parts = flags
        .split(',')
        .map((s: string) => s.trim())
        .filter((s) => s.length > 0);
    let short: string | undefined;
    let long: string | undefined;
    let valueRequired = false;
    let isNegated = false;
    for (const part of parts) {
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
            valueRequired = /<.+>|\[.+\]/.test(part);
        } else if (part.startsWith('-') && part.length === 2) {
            short = part[1];
        }
    }
    if (!long) {
        throw new Error(`Invalid flags format: "${flags}", no valid long flag found.`);
    }
    const key = long;
    let type: YargsOption['type'] = inferTypeFromFlags(flags, defaultValue);
    const isSwitch = !valueRequired && !isNegated && !flags.match(/<.+>|\[.+\]/);
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
    if (parser) config.coerce = parser;
    if (valueRequired && !isNegated && flags.includes('<')) config.demandOption = true;

    return { key, config } as { key: string; config: YargsOption };
};

export abstract class LaniaCommand<ActionArgs extends any[] = any[]> {
    // 移除 this.hooks 和 this.pluginManager 属性
    // public hooks: LaniaCommandHooks;
    // protected pluginManager: IPluginContainer;

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
        // 移除 pluginManager 参数
        // pluginManager: IPluginContainer = new PluginManager(),
    ) {
        // 移除 pluginManager 赋值
        // this.pluginManager = pluginManager;

        this.parentCommand = config.parent;
        this.actor = config.actor;
        this.legacyHooks = config.hooks ?? {};
        this.commandNeededArgs = config.commandNeededArgs;
        this.subcommands = config.subcommands;
        this.config = config;

        // 移除 Hooks 初始化逻辑
        // this.hooks = { ... }
        // (this.hooks.onInitialize as ParallelHook<[]>).call();
        // (this.hooks.onCommandPreInit as ParallelHook<[]>).call();

        // 移除 applyPlugins 调用
        // this.applyPlugins(config.plugins);
    }

    // 移除所有与 Hooks/Plugin 相关的方法，仅保留原有 API

    /* public getPlugin<T extends AnyPlugin>(name: string): T { ... }
    public async getConfig(...): Promise<any> { ... }
    public async writeFile(...): Promise<{ path?: string | null; content?: string }> { ... }
    public async renderTemplate(...): Promise<{ data?: Record<string, any>; path?: string | null; content?: string }> { ... }
    public async monitorPluginCall(...): Promise<{ data?: any; config?: any }> { ... }
    public async installDeps(...): Promise<any> { ... }
    public async execCommand(...): Promise<any> { ... }
    public async promptUser(...): Promise<any> { ... }
    private applyPlugins(...): void { ... }
    private async executeAutoActions(...): Promise<void> { ... }
    */

    public load(): CommandModule {
        const actor = this.actor;
        const commandNeededArgs = this.commandNeededArgs;
        const subcommands = this.subcommands;

        // 仅在 actor 或 commandNeededArgs 缺失时，才尝试使用反射元数据 (保持不变)
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

            return this._buildCommandModule(meta.actor, meta.commandNeededArgs, meta.subcommands);
        }

        return this._buildCommandModule(actor, commandNeededArgs, subcommands);
    }

    private _buildCommandModule(
        actor: LaniaCommandActionInterface<ActionArgs>,
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

        // Builder 逻辑保持不变
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

        // ⭐️ Handler 改造：删除所有 Hooks 和 executeAutoActions 调用
        const handler = async (argv: any) => {
            let currentArgv = argv;
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
                currentArgv = reducedArgv;

                // 2. 移除所有 Hooks 调用: onArgsParsed, preAction
                // currentArgv = await (this.hooks.onArgsParsed as WaterfallHook<any, []>).call(reducedArgv,);
                // await this.executeAutoActions('preAction', currentArgv);

                // 3. 兼容原有 Hook: beforeExecute
                await this.legacyHooks.beforeExecute?.();

                // 4. 执行 Actor
                await actor.handle(...([currentArgv] as ActionArgs));

                // 5. 兼容原有 Hook: afterExecute
                await this.legacyHooks.afterExecute?.();

                // 6. 移除所有 Hooks 调用: postAction, onSuccess
                // await this.executeAutoActions('postAction', currentArgv);
                // await (this.hooks.onSuccess as ParallelHook<[any]>).call(currentArgv);
            } catch (err) {
                // 7. 兼容原有 Hook: onError
                await this.legacyHooks.onError?.();

                // 8. 移除所有 Hooks 调用: onError (自动化动作), onError (Hook)
                // await this.executeAutoActions('onError', err);
                // await (this.hooks.onError as ParallelHook<[Error]>).call(err as Error);

                // 9. 保持原有错误输出和退出逻辑
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
