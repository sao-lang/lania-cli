// BaseLaniaAction.ts

import {
    LaniaCommandActionInterface,
    LaniaCommandHooks,
    IPluginContainer,
    LaniaCommandConfigInterface,
    CommandActionInstruction,
    WaterfallHook,
    ParallelHook,
    AnyPlugin,
    Question,
    InteractionConfig,
    // 假设这些类型在 @lania-cli/types 中已定义
} from '@lania-cli/types';

import { createHook } from './command-plugins-manager'; // 假设路径
import { logger } from '@lania-cli/common'; // 假设路径

// 辅助类型：LegacyHooks 定义为可选属性的接口
type LegacyHooks = LaniaCommandConfigInterface['hooks'];
type TemplateData = { templateContent: string; context: Record<string, any> };

/**
 * 抽象基类：包含完整的 Hooks 注册、生命周期控制和依赖注入逻辑。
 * 采用 initialize() 后置注入模式接收依赖。
 */
export abstract class BaseLaniaAction<ActionArgs extends any[] = any[]>
    implements LaniaCommandActionInterface<ActionArgs>
{
    public hooks: LaniaCommandHooks;
    protected pluginManager!: IPluginContainer;
    protected config!: LaniaCommandConfigInterface<ActionArgs>;

    constructor() {
        // 1. Hooks 定义与初始化
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
            onDependenciesInstall: createHook('waterfall'),
            onInteractionPrompt: createHook('waterfall'),
            onShellCommand: createHook('parallel'),
            onPluginApiCall: createHook('parallel'),
            onSuccess: createHook('parallel'),
            onError: createHook('parallel'),
        } as LaniaCommandHooks;
    }

    // --- 依赖注入与初始化 (后置注入) ---

    public initialize(
        config: LaniaCommandConfigInterface<ActionArgs>,
        pluginManager: IPluginContainer,
    ): void {
        this.config = config;
        this.pluginManager = pluginManager;

        this.applyPlugins(config.plugins);

        // ⭐️ 调用 onInitialize, onCommandPreInit 钩子
        (this.hooks.onInitialize as ParallelHook<[]>).call();
        (this.hooks.onCommandPreInit as ParallelHook<[]>).call();
    }

    /**
     * @description Action 的核心业务逻辑，由子类实现。
     */
    public abstract handle(...args: ActionArgs): Promise<void>;

    // --- Hook API 封装 (公共方法) ---

    public getPlugin<T extends AnyPlugin>(name: string): T {
        if (!this.pluginManager)
            throw new Error('Plugin manager not initialized. Call initialize() first.');
        return this.pluginManager.get<T>(name);
    }

    public async getConfig(originalConfig: any, configType: string): Promise<any> {
        // ⭐️ 调用 onConfigGet 钩子
        let config = await (this.hooks.onConfigGet as WaterfallHook<any, [string]>).call(
            originalConfig,
            configType,
        );

        // ⭐️ 调用 onConfigResolve 钩子
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
    ): Promise<string> {
        // ⭐️ 调用 onFileWrite 钩子 (允许插件修改内容或执行写入)
        const finalContent = await (
            this.hooks.onFileWrite as WaterfallHook<string, [string, string]>
        ).call(content, filePath, encoding);
        return finalContent;
    }

    public async renderTemplate(
        templatePath: string,
        templateContent: string,
        context: Record<string, any>,
    ): Promise<string> {
        const initialData: TemplateData = { templateContent, context };
        // ⭐️ 调用 onTemplateParse 钩子
        const finalData = await (this.hooks.onTemplateParse as WaterfallHook<any, [string]>).call(
            initialData,
            templatePath,
        );

        if (finalData === initialData || !finalData.templateContent) {
            return templateContent; // 没有插件处理，返回原始内容
        }

        return finalData.templateContent;
    }

    public async installDeps(options: InteractionConfig): Promise<void> {
        // ⭐️ 调用 onDependenciesModify 钩子 (允许插件修改依赖列表)
        const dependencies = await this.hooks.onDependenciesModify.call(options);
        await this.hooks.onDependenciesInstall.call(dependencies);
    }

    public async execCommand(command: string, ...args: any[]) {
        // ⭐️ 调用 onShellCommand 钩子
        await (this.hooks.onShellCommand as ParallelHook<[string, string]>).call(command, ...args);
    }

    public async promptUser(questions: Question | Question[]): Promise<any> {
        // ⭐️ 调用 onInteractionPrompt 钩子
        const answersOrQuestions = await this.hooks.onInteractionPrompt.call(questions);

        if (
            Array.isArray(answersOrQuestions) &&
            answersOrQuestions.length > 0 &&
            answersOrQuestions[0].type
        ) {
            throw new Error(
                'Prompt failed: No plugin was registered to handle the user interaction (onInteractionPrompt).',
            );
        }

        return answersOrQuestions;
    }

    public async monitorPluginCall(
        pluginName: string,
        methodName: string,
        args: any[] = [],
    ): Promise<void> {
        // ⭐️ 调用 onPluginApiCall 钩子
        await (this.hooks.onPluginApiCall as ParallelHook<[string, string, any[]]>).call(
            pluginName,
            methodName,
            args,
        );
    }

    // --- 内部辅助方法 ---

    private applyPlugins(plugins?: LaniaCommandConfigInterface['plugins']): void {
        if (!this.pluginManager) return;
        const pluginConfigs = plugins || [];
        for (const config of pluginConfigs) {
            try {
                const pluginInstance = this.pluginManager.get<any>(config.name);
                if (typeof pluginInstance.apply === 'function') {
                    // 将 BaseLaniaAction 实例作为上下文传递给插件
                    pluginInstance.apply(this);
                }
            } catch (e) {
                logger.warn(`Failed to apply plugin ${config.name}: ${(e as Error).message}`);
            }
        }
    }

    private async executeAutoActions(
        hookName: CommandActionInstruction['hook'],
        data: any,
    ): Promise<void> {
        const actions = this.config.autoActions || [];
        for (const action of actions) {
            if (action.hook === hookName) {
                if (action.condition && !action.condition(data)) continue;

                const pluginInstance = this.getPlugin(action.plugin);
                const method = pluginInstance[action.method];

                if (typeof method === 'function') {
                    // 修正点：确保 args 在这里被定义
                    const args = action.argsMap ? action.argsMap.map((key) => data[key]) : [];

                    // 触发 onPluginApiCall Hook (用于监控)
                    await this.monitorPluginCall(action.plugin, action.method, args);

                    // 实际执行插件方法
                    await method.call(pluginInstance, ...args);
                }
            }
        }
    }

    // --- 命令执行流程 (生命周期) ---

    public async run(argv: any, legacyHooks: LegacyHooks = {}) {
        let currentArgv = argv;

        try {
            // ⭐️ 调用 onArgsParsed 钩子
            currentArgv = await (this.hooks.onArgsParsed as WaterfallHook<any, []>).call(
                currentArgv,
            );

            // ⭐️ 调用 preAction (自动化动作)
            await this.executeAutoActions('preAction', currentArgv);

            // 兼容原有 Hook
            await legacyHooks.beforeExecute?.();

            // 核心业务逻辑
            await this.handle(...([currentArgv] as ActionArgs));

            // 兼容原有 Hook
            await legacyHooks.afterExecute?.();

            // ⭐️ 调用 postAction (自动化动作)
            await this.executeAutoActions('postAction', currentArgv);

            // ⭐️ 调用 onSuccess 钩子
            await (this.hooks.onSuccess as ParallelHook<[any]>).call(currentArgv);
        } catch (err) {
            // 兼容原有 Hook
            await legacyHooks.onError?.();

            // ⭐️ 调用 onError (自动化动作)
            await this.executeAutoActions('onError', err);

            // ⭐️ 调用 onError 钩子
            await (this.hooks.onError as ParallelHook<[Error]>).call(err as Error);

            logger.error(err instanceof Error ? err.stack : String(err));
            process.exit(1);
        }
    }
}
