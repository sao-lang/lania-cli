import 'reflect-metadata';
import { Argv, CommandModule } from 'yargs';
import { logger } from './logger'; // 保持原有 logger 引入
import {
    CommandHook,
    CommandOption,
    CommandNeededArgsInterface,
    LaniaCommandActionInterface,
    LaniaCommandMetadata,
    YargsOption,
    LaniaCommandConfigInterface,
    IPluginContainer, // ⭐️ 新增：从 types 导入接口
    LaniaCommandHooks, // ⭐️ 新增：从 types 导入 Hook 接口
    CommandActionInstruction, // ⭐️ 新增：从 types 导入 Action 指令
    WaterfallHook, // ⭐️ 新增：从 types 导入 Hook 类型以便类型断言
    ParallelHook, // ⭐️ 新增：从 types 导入 Hook 类型以便类型断言
    AnyPlugin,
    DepencencyAndVresion,
    Question,
} from '@lania-cli/types';

// ⭐️ 导入插件系统实现 (需确保 command-plugin-manager.ts 已存在)
import { createHook, PluginManager } from './command-plugins-manager';

// ----------------------------------------------------------------------
// 辅助函数 (保持不变)
// ----------------------------------------------------------------------

const camelCase = (input: string) => {
    // 确保处理如 'no-cache' -> 'noCache'
    return input.replace(/[-_]+(\w)/g, (_, c) => c.toUpperCase());
};

const inferTypeFromFlags = (flags: string, defaultValue: any): YargsOption['type'] => {
    if (flags.includes('<number>')) return 'number';
    if (flags.includes('<string>')) return 'string';
    if (flags.includes('<')) return 'string';
    if (typeof defaultValue === 'number') return 'number';
    if (typeof defaultValue === 'boolean') return 'boolean';
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
            valueRequired = /<.+>/.test(part);
        } else if (part.startsWith('-') && part.length === 2) {
            short = part[1];
        }
    }

    if (!long) {
        throw new Error(`Invalid flags format: "${flags}", no valid long flag found.`);
    }

    const key = long;

    const config: YargsOption = {
        describe: description,
        alias: short,
        default: defaultValue,
        type: inferTypeFromFlags(flags, defaultValue),
        choices,
    };

    // 如果是取反标志，强制设置为 boolean 类型，让 yargs 处理 'no-' 前缀的布尔逻辑
    if (isNegated) {
        config.type = 'boolean';
    }

    if (parser) config.coerce = parser;
    if (valueRequired && !isNegated) config.demandOption = true;

    return { key, config } as { key: string; config: YargsOption };
};

// ----------------------------------------------------------------------
// LaniaCommand 基类 (核心改造区域)
// ----------------------------------------------------------------------

export abstract class LaniaCommand<ActionArgs extends any[] = any[]> {
    // ⭐️ 替换为新的全面 Hook 系统
    public hooks: LaniaCommandHooks;
    // ⭐️ 新增 PluginManager 引用
    protected pluginManager: IPluginContainer;
    protected config: LaniaCommandConfigInterface<ActionArgs>;

    // 保持原有私有成员结构，用于兼容 config.hooks
    private legacyHooks: {
        beforeExecute?: CommandHook;
        afterExecute?: CommandHook;
        onError?: CommandHook;
    } = {};

    private parentCommand?: LaniaCommandConfigInterface['parent'];
    private actor?: LaniaCommandActionInterface<ActionArgs>;
    private commandNeededArgs?: CommandNeededArgsInterface;
    private subcommands?: LaniaCommandConfigInterface['subcommands'];

    // ⭐️ 构造函数修改：新增 pluginManager 参数 (作为依赖注入)
    constructor(
        config: LaniaCommandConfigInterface<ActionArgs> = {} as LaniaCommandConfigInterface,
        pluginManager: IPluginContainer = new PluginManager(), // 允许外部注入，但提供默认实现
    ) {
        this.pluginManager = pluginManager;

        this.parentCommand = config.parent;
        this.actor = config.actor;
        this.legacyHooks = config.hooks ?? {};
        this.commandNeededArgs = config.commandNeededArgs;
        this.subcommands = config.subcommands;
        this.config = config;

        // 1. 实例化 Hook 系统
        this.hooks = {
            onInitialize: createHook('parallel'),
            onCommandPreInit: createHook('parallel'),
            onArgsParsed: createHook('waterfall'),
            onFilesPrepare: createHook('waterfall'),
            onConfigGet: createHook('waterfall'),
            onConfigResolve: createHook('waterfall'),
            onFileWrite: createHook('waterfall'),
            onTemplateParse: createHook('waterfall'),
            onDependenciesModify: createHook('waterfall'),
            onInteractionPrompt: createHook('waterfall'),
            onShellCommand: createHook('parallel'),
            onPluginApiCall: createHook('parallel'),
            onSuccess: createHook('parallel'),
            onError: createHook('parallel'),
        } as LaniaCommandHooks; // 类型断言以符合接口

        // 2. 启动新的 Hook 生命周期
        (this.hooks.onInitialize as ParallelHook<[]>).call();
        (this.hooks.onCommandPreInit as ParallelHook<[]>).call();

        // 3. 应用插件
        this.applyPlugins(config.plugins);
    }

    // ----------------------------------------------------
    // ⭐️ 插件系统公共 API (新增对外暴露的接口)
    // ----------------------------------------------------

    public getPlugin<T extends AnyPlugin>(name: string): T {
        return this.pluginManager.get<T>(name);
    }

    public async getConfig(originalConfig: any, configType: string): Promise<any> {
        let config = await (this.hooks.onConfigGet as WaterfallHook<any, [string]>).call(
            originalConfig,
            configType,
        );
        config =
            (await (this.hooks.onConfigResolve as WaterfallHook<any, [string]>)?.call(
                config,
                configType,
            )) ?? config;
        return config;
    }

    public async writeFile(
        filePath: string,
        content: string,
        encoding: string = 'utf8',
    ): Promise<{ path?: string | null; content?: string }> {
        // 触发 onFileWrite Hook
        await (this.hooks.onFileWrite as WaterfallHook<string, [string, string]>).call(
            content,
            filePath,
            encoding,
        );
        return {
            content,
            path: filePath,
        };
    }

    public async renderTemplate(
        templatePath: string,
        templateContent: string,
        context: Record<string, any>,
    ): Promise<{ data?: Record<string, any>; path?: string | null; content?: string }> {
        const initialData = { templateContent, context };
        // 触发 onTemplateParse Hook
        const finalData = await (this.hooks.onTemplateParse as WaterfallHook<any, [string]>).call(
            initialData,
            templatePath,
        );
        return {
            data: finalData,
            path: templatePath,
            content: templateContent,
        }; // 模拟 EJS
    }

    public async monitorPluginCall(
        targetPluginName: string,
        methodName: string,
        args: any[],
    ): Promise<{ data?: any; config?: any }> {
        // 触发 onPluginApiCall Hook
        const data = await (
            this.hooks.onPluginApiCall as ParallelHook<[string, string, any[]]>
        ).call(targetPluginName, methodName, args);
        return {
            data,
        };
    }

    public async installDeps(initialDeps: DepencencyAndVresion[]): Promise<any> {
        // 触发 onDependenciesModify Hook
        await (this.hooks.onDependenciesModify as WaterfallHook<string[], []>).call(initialDeps);
        // 触发 onShellCommand Hook
    }

    public async execCommand(command: string, ...args: any[]) {
        await (this.hooks.onShellCommand as ParallelHook<[string, string]>).call(command, ...args);
    }

    public async promptUser(questions: Question): Promise<any> {
        // 触发 onInteractionPrompt Hook
        const answers = await (this.hooks.onInteractionPrompt as WaterfallHook<any, []>).call(
            questions,
        );
        return answers;
    }

    // ----------------------------------------------------
    // 内部实现 (Auto Action/Plugin Apply)
    // ----------------------------------------------------

    private applyPlugins(plugins?: LaniaCommandConfigInterface['plugins']): void {
        const pluginConfigs = plugins || [];
        for (const config of pluginConfigs) {
            try {
                const pluginInstance = this.pluginManager.get<any>(config.name);
                if (typeof pluginInstance.apply === 'function') {
                    pluginInstance.apply(this);
                }
            } catch (e) {
                logger.warn(`Failed to apply plugin ${config.name}: ${(e as Error).message}`);
            }
        }
    }

    private async executeAutoActions(
        hookName: CommandActionInstruction['hook'],
        argv: any,
    ): Promise<void> {
        const actions = this.config.autoActions || [];
        for (const action of actions) {
            if (action.hook === hookName) {
                if (action.condition && !action.condition(argv)) continue;

                const pluginInstance = this.getPlugin(action.plugin);
                const method = pluginInstance[action.method];

                if (typeof method === 'function') {
                    const args = action.argsMap ? action.argsMap.map((key) => argv[key]) : [];
                    // 监控插件调用
                    await this.monitorPluginCall(action.plugin, action.method, args);
                    await method.call(pluginInstance, ...args);
                }
            }
        }
    }

    // ----------------------------------------------------
    // 原有 CommandModule 逻辑 (最小修改以集成 Hook)
    // ----------------------------------------------------

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

        // ⭐️ Handler 改造：集成 Hook
        const handler = async (argv: any) => {
            let currentArgv = argv;
            try {
                // 1. 保持原有 reducedArgv 逻辑
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

                // 2. 新 Hook: onArgsParsed
                currentArgv = await (this.hooks.onArgsParsed as WaterfallHook<any, []>).call(
                    reducedArgv,
                );

                // 3. 新 Hook: preAction (自动化动作)
                await this.executeAutoActions('preAction', currentArgv);

                // 4. 兼容原有 Hook: beforeExecute
                await this.legacyHooks.beforeExecute?.();

                // 5. 执行 Actor
                await actor.handle(...([currentArgv] as ActionArgs));

                // 6. 兼容原有 Hook: afterExecute
                await this.legacyHooks.afterExecute?.();

                // 7. 新 Hook: postAction (自动化动作)
                await this.executeAutoActions('postAction', currentArgv);

                // 8. 新 Hook: onSuccess
                await (this.hooks.onSuccess as ParallelHook<[any]>).call(currentArgv);
            } catch (err) {
                // 9. 兼容原有 Hook: onError
                await this.legacyHooks.onError?.();

                // 10. 新 Hook: onError (自动化动作)
                await this.executeAutoActions('onError', err);

                // 11. 新 Hook: onError (Hook)
                await (this.hooks.onError as ParallelHook<[Error]>).call(err as Error);

                // 12. 保持原有错误输出和退出逻辑
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
