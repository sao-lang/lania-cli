import { lint, load } from '@commitlint/core';
// 假设 ConfigurationLoader 是一个通用的配置加载模块
import { ConfigurationLoader } from '../configuration-loader';
import { CommitlintConfigSource, CommitlintPluginConfig } from '@lania-cli/types';

// 定义 commitlint load 函数的返回类型别名，方便使用
type CommitlintConfig = Awaited<ReturnType<typeof load>>;

export class CommitlintPlugin {
    private configSource: CommitlintConfigSource;
    // ⭐️ 优化点 1: 缓存加载后的配置，避免重复的文件 I/O 和解析。
    private cachedConfig: CommitlintConfig | null = null;

    constructor(options: CommitlintPluginConfig = {}) {
        // 使用 configSource 区分配置的来源或内容
        this.configSource = options.config ?? {};
    }

    /**
     * 加载 commitlint 配置，并处理配置路径字符串或对象。
     * 如果配置已缓存，则直接返回缓存结果。
     * @returns Promise<CommitlintConfig> 加载后的 commitlint 配置对象。
     */
    private async loadConfig(): Promise<CommitlintConfig> {
        if (this.cachedConfig) {
            return this.cachedConfig;
        }

        let configToLoad = this.configSource;

        // ⭐️ 优化点 2: 处理配置源是路径字符串的情况
        if (typeof this.configSource === 'string') {
            // 假设 ConfigurationLoader.load('commitlint') 能够根据字符串路径解析出配置对象
            // 或者返回一个可以被 @commitlint/core.load() 处理的配置路径/对象。
            try {
                // 注意：这里假设 ConfigurationLoader.load 负责解析文件并返回内容对象
                configToLoad = await ConfigurationLoader.load('commitlint', this.configSource);
            } catch (error) {
                console.error(
                    `Failed to load commitlint config from source: ${this.configSource}`,
                    error,
                );
                throw new Error('Commitlint configuration loading failed.');
            }
        }

        try {
            // 使用 @commitlint/core 的 load() 函数最终解析配置（处理 extends 等字段）
            const loadedConfig = await load(configToLoad as any);
            this.cachedConfig = loadedConfig;
            return loadedConfig;
        } catch (error) {
            console.error('Failed to parse commitlint configuration:', error);
            throw new Error('Commitlint configuration parsing failed.');
        }
    }

    /**
     * 校验提交信息。
     * @param commitMessage 待校验的提交信息字符串。
     * @returns 校验结果 (Promise<LintOutcome>)。
     */
    public async run(commitMessage?: string): ReturnType<typeof lint> {
        if (!commitMessage) {
            throw new Error('commitMessage is required for linting.');
        }

        try {
            // 每次运行时调用 loadConfig，但由于缓存机制，配置只会被加载一次
            const config = await this.loadConfig();

            // config.rules 包含 lint 函数所需的所有规则
            return await lint(commitMessage, config.rules);
        } catch (err) {
            // 捕获 lint 或配置加载/解析过程中抛出的任何错误
            console.error('Commitlint run failed:', err);
            // 重新抛出，以便外部调用者能够捕获并处理失败状态
            throw err;
        }
    }
}
