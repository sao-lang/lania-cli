import { lint, load } from '@commitlint/core';
import { ConfigurationLoader } from '../../lib/configuration-loader';
import { CommitlintConfigSource, CommitlintPluginConfig } from "@lania-cli/types";

export class CommitlintPlugin {
    private config: CommitlintConfigSource;

    constructor(options: CommitlintPluginConfig = {}) {
        this.config = options.config ?? {};
    }

    // 加载配置（支持路径字符串或对象）
    private async loadConfig(): Promise<Awaited<ReturnType<typeof load>>> {
        if (typeof this.config === 'string') {
            const resolved = await ConfigurationLoader.load('commitlint');
            return load(resolved);
        }
        return load(this.config);
    }

    // 校验提交信息（支持直接传 message）
    public async run(commitMessage?: string): ReturnType<typeof lint> {
        if (!commitMessage) {
            throw new Error('commitMessage is required for linting.');
        }

        try {
            const config = await this.loadConfig();
            return await lint(commitMessage, config.rules);
        } catch (err) {
            console.error('Commitlint failed:', err);
            throw err;
        }
    }
}
