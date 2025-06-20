import 'reflect-metadata';
import yargs, { Argv, CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from './logger'; // 你原来的 logger
import { CommandOption, CommandHook, LaniaCommandActionInterface } from '@lania-cli/types';

// 抽象命令基类
export abstract class LaniaCommand<ActionArgs extends any[] = any[]> {
    protected hooks: {
        beforeExecute?: CommandHook;
        afterExecute?: CommandHook;
        onError?: CommandHook;
    } = {};

    private parentCommand?: LaniaCommand;

    constructor(parent?: LaniaCommand) {
        this.parentCommand = parent;
    }

    // 载入命令，返回 yargs 的 CommandModule
    public load(): CommandModule {
        // eslint-disable-next-line @typescript-eslint/ban-types
        const constructor = this.constructor as Function;
        const meta = Reflect.getMetadata(constructor, constructor);
        if (!meta) throw new Error(`Command metadata not found for ${this.constructor.name}`);

        const { actor: ActorCtor, commandNeededArgs, subcommands } = meta;
        const actor: LaniaCommandActionInterface<ActionArgs> = new ActorCtor();

        const { name, description, options, alias, examples, args } = commandNeededArgs;

        return {
            command: args?.length ? `${name} ${args.join(' ')}` : name,
            describe: description,
            aliases: alias ? [alias] : [],
            builder: (yargs: Argv) => {
                this.registerOptions(yargs, options);

                subcommands?.forEach((SubCmdCtor) => {
                    const subInstance = new SubCmdCtor(this);
                    yargs.command(subInstance.load());
                });

                if (examples) {
                    examples.forEach((ex) => {
                        yargs.example(ex, '');
                    });
                }

                return yargs;
            },
            handler: async (argv: any) => {
                try {
                    const options = { ...argv };
                    delete options._;
                    delete options['$0'];

                    await this.hooks.beforeExecute?.();
                    // 这里用断言保证类型兼容
                    await actor.handle(...([options] as ActionArgs));
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
        options?.forEach((opt) => {
            const key = opt.flags.match(/--(\w+)/)?.[1];
            if (!key) return;

            const isRequired = opt.flags.includes('<');
            const isBoolean = !opt.flags.includes('<') && !opt.flags.includes('[');

            yargs.option(key, {
                describe: opt.description,
                type: isBoolean ? 'boolean' : 'string',
                choices: opt.choices,
                default: opt.defaultValue,
                demandOption: isRequired,
            });
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
