
import { lint } from '@commitlint/core';

// 定义插件配置类型
interface CommitLintPluginConfig {
    config?: any; // 这里可以传入自定义的 commitlint 配置
}

export class CommitlintPlugin {
    private config: Record<string, any>;

    constructor(config: CommitLintPluginConfig = {}) {
        this.config = config.config; // 如果没有传入配置，使用默认配置
    }

    // run 方法接受回调函数和可选的 commitMessage 或文件路径
    public async run(commitMessage?: string): Promise<ReturnType<typeof lint>>{
        const result = await lint(
            commitMessage,
            this.config, // 使用传入的配置
        );
        return result;
    }
}
