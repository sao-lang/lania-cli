import {
    LaniaCommandActionInterface,
    LaniaCommandHooks,
    IPluginContainer,
    LaniaCommandConfigInterface,
    CommandActionInstruction,
    AnyPlugin,
    Question,
    InteractionConfig,
} from '@lania-cli/types';

import { createHook } from './hooks'; // 假设路径
import { logger } from '../../lib'; // 假设路径

// 辅助类型：LegacyHooks 定义为可选属性的接口
type LegacyHooks = LaniaCommandConfigInterface['hooks'];
type TemplateData = { templateContent: string; context: Record<string, any> };

export abstract class LaniaAction<ActionArgs extends any[] = any[]>
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
    public initialize(
        config: LaniaCommandConfigInterface<ActionArgs>,
        pluginManager: IPluginContainer,
    ): void {
        this.config = config;
        this.pluginManager = pluginManager;
        this.applyPlugins(config.plugins);
        this.hooks.onInitialize.call();
        this.hooks.onCommandPreInit.call();
    }

    public abstract handle(...args: ActionArgs): Promise<void>;
    public getPlugin<T extends AnyPlugin>(name: string): T {
        if (!this.pluginManager)
            throw new Error('Plugin manager not initialized. Call initialize() first.');
        return this.pluginManager.get<T>(name);
    }

    public async getConfig(originalConfig: any, configType: string): Promise<any> {
        let config = await this.hooks.onConfigGet.call(originalConfig, configType);

        config = (await this.hooks.onConfigResolve?.call(config, configType)) ?? config;
        return config;
    }

    public async writeFile(
        filePath: string,
        content: string,
        encoding: BufferEncoding = 'utf8',
    ): Promise<string> {
        const finalContent = await this.hooks.onFileWrite.call(content, filePath, encoding);
        return finalContent;
    }

    public async renderTemplate(
        templatePath: string,
        templateContent: string,
        context: Record<string, any>,
    ): Promise<string> {
        const initialData: TemplateData = { templateContent, context };
        const finalData = await this.hooks.onTemplateParse.call(initialData, templatePath);

        if (finalData === initialData || !finalData.templateContent) {
            return templateContent;
        }

        return finalData.templateContent;
    }

    public async installDeps(options: InteractionConfig): Promise<void> {
        const dependencies = await this.hooks.onDependenciesModify.call(null, options);
        await this.hooks.onDependenciesInstall.call(dependencies);
    }

    public async execCommand(command: string, ...args: any[]) {
        await this.hooks.onShellCommand.call(...[command, ...args]);
    }

    public async promptUser(questions: Question | Question[]): Promise<any> {
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
        await this.hooks.onPluginApiCall.call(pluginName, methodName, args);
    }
    private applyPlugins(plugins?: LaniaCommandConfigInterface['plugins']): void {
        if (!this.pluginManager) return;
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
        data: any,
    ): Promise<void> {
        const actions = this.config.autoActions || [];
        for (const action of actions) {
            if (action.hook === hookName) {
                if (action.condition && !action.condition(data)) continue;
                const pluginInstance = this.getPlugin(action.plugin);
                const method = pluginInstance[action.method];
                if (typeof method === 'function') {
                    const args = action.argsMap ? action.argsMap.map((key) => data[key]) : [];
                    await this.monitorPluginCall(action.plugin, action.method, args);
                    await method.call(pluginInstance, ...args);
                }
            }
        }
    }

    public async run(argv: any, legacyHooks: LegacyHooks = {}) {
        let currentArgv = argv;
        try {
            currentArgv = await this.hooks.onArgsParsed.call(currentArgv);
            await this.executeAutoActions('preAction', currentArgv);
            await legacyHooks.beforeExecute?.();
            await this.handle(...([currentArgv] as ActionArgs));
            await legacyHooks.afterExecute?.();
            await this.executeAutoActions('postAction', currentArgv);
            await this.hooks.onSuccess.call(currentArgv);
        } catch (err) {
            await legacyHooks.onError?.();
            await this.executeAutoActions('onError', err);
            await this.hooks.onError.call(err as Error);
            logger.error(err instanceof Error ? err.stack : String(err));
            process.exit(1);
        }
    }
}
