import {
    CommandNeededArgsInterface,
    LaniaCommandActionInterface,
    CommandOption,
    CommandHook,
} from '@lania-cli/types';
import { logger } from './logger';
import { Command, Option } from 'commander';

export const registerCommands = (name: string, version: string, commands?: LaniaCommand[]) => {
    const program = new Command();

    program
        .name(name)
        .version(version, '-v, --version', '显示版本')
        .helpOption('-h, --help', '显示帮助信息')
        .usage('<command> [options]');

    commands?.forEach((command) => {
        program.addCommand(command.load());
    });

    program.parseAsync(process.argv).catch((e) => {
        logger.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
    });
};

export abstract class LaniaCommand<ActionArgs extends any[] = any[]> {
    // 基础定义
    protected abstract actor: LaniaCommandActionInterface<ActionArgs>;
    protected abstract commandNeededArgs: CommandNeededArgsInterface;
    protected subcommands?: LaniaCommand[];

    // 新增功能
    protected hooks: {
        beforeExecute?: CommandHook;
        afterExecute?: CommandHook;
        onError?: CommandHook;
    } = {};

    private parentCommand?: LaniaCommand;

    constructor(parent?: LaniaCommand) {
        this.parentCommand = parent;
    }

    /**
     * 增强版命令加载
     */
    public load(): Command {
        const { name, description, options, alias, examples } = this.commandNeededArgs ?? {};
        const command = new Command(name);

        // 基础配置
        this.configureCommand(command, { description, alias, examples });

        // 选项注册（支持高级校验）
        this.registerOptions(command, options);

        // 动作处理（带生命周期钩子）
        command.action(async (...args: ActionArgs) => {
            try {
                await this.executeWithHooks(...args);
            } catch (error) {
                await this.handleError(error);
            }
        });

        // 子命令注册
        this.registerSubcommands(command);

        // 增强帮助信息
        this.enhanceHelp(command);

        return command;
    }

    // 私有方法实现
    private configureCommand(
        command: Command,
        config: Pick<CommandNeededArgsInterface, 'description' | 'alias' | 'examples'>,
    ) {
        const { description, alias, examples } = config;
        description && command.description(description);
        alias && command.alias(alias);

        if (examples) {
            command.on('--help', () => {
                console.log('\nExamples:');
                examples.forEach((ex) => console.log(`  ${ex}`));
            });
        }
    }

    private registerOptions(command: Command, options?: CommandOption[]) {
        options?.forEach((opt) => {
            if (opt.required && !opt.flags.includes('<')) {
                throw new Error(`Required option "${opt.flags}" must use <> syntax`);
            }

            const option = new Option(opt.flags, opt.description);
            if (opt.defaultValue !== undefined) {
                option.default(opt.defaultValue);
            }
            if (opt.choices) {
                option.choices(opt.choices);
            }
            command.addOption(option);
        });
    }

    private async executeWithHooks(...args: ActionArgs) {
        await this.hooks.beforeExecute?.();
        const result = await this.actor.handle(...args);
        await this.hooks.afterExecute?.();
        return result;
    }

    private async handleError(error: unknown) {
        await this.hooks.onError?.();
        logger.error(error instanceof Error ? error.stack || error.message : String(error));
        process.exit(1);
    }

    private registerSubcommands(command: Command) {
        this.subcommands?.forEach((sub) => {
            const subcommand = sub.load();
            // 继承父命令的全局选项
            this.parentCommand?.commandNeededArgs.options?.forEach((opt) => {
                if (!subcommand.options.some((o) => o.flags === opt.flags)) {
                    subcommand.addOption(new Option(opt.flags, opt.description));
                }
            });
            command.addCommand(subcommand);
        });
    }

    private enhanceHelp(command: Command) {
        command.showHelpAfterError('(使用 --help 查看可用选项)').showSuggestionAfterError();

        command.on('--help', () => {
            if (this.subcommands?.length) {
                console.log('\n子命令可通过 --help 查看详情，例如:');
                console.log(
                    `  ${command.name()} ${this.subcommands[0].commandNeededArgs.name} --help`,
                );
            }
        });
    }

    // 新增公共方法
    public addHook(type: keyof typeof this.hooks, fn: CommandHook) {
        this.hooks[type] = fn;
    }

    public getParent(): LaniaCommand | undefined {
        return this.parentCommand;
    }
}
