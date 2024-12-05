import { lint, load } from '@commitlint/core';
import ConfigurationLoader from '@lib/configuration/configuration.loader';

// 定义插件配置类型
interface CommitLintPluginConfig {}

export class CommitlintPlugin {
    private config: Record<string, any> | string;

    constructor(config: CommitLintPluginConfig = {}) {
        this.config = config; // 如果没有传入配置，使用默认配置
    }
    private async loadConfig(config: string | Record<string, any>) {
        if (typeof config === 'string') {
            const configResult = await new ConfigurationLoader().load('commitlint');
            return await load(configResult);
        }
        return await load(config);
    }
    // run 方法接受回调函数和可选的 commitMessage 或文件路径
    public async run(commitMessage?: string): Promise<ReturnType<typeof lint>> {
        const config = await this.loadConfig(this.config);
        const result = await lint(
            commitMessage,
            config.rules, // 使用传入的配置
        );
        return result;
    }
}
