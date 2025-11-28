import { CommitData, CommitizenConfig, CommitType, SkipKey } from '@lania-cli/types';
import { simplePromptInteraction } from '../../utils/simple-prompt-interaction';

// 'type' 不在列表中，因为它在规范中是必需的。

/**
 * 当用户在确认步骤拒绝提交时抛出的错误。
 */
export class CommitAbortedError extends Error {
    constructor(message: string = 'Commit process aborted by user.') {
        super(message);
        this.name = 'CommitAbortedError';
    }
}

const DEFAULT_CONFIG: CommitizenConfig = {
    types: [
        { value: 'feat', name: 'feat:     新功能' },
        { value: 'fix', name: 'fix:      修复' },
        { value: 'docs', name: 'docs:     文档变更' },
        { value: 'style', name: 'style:    代码格式(不影响代码运行的变动)' },
        { value: 'refactor', name: 'refactor: 重构(既不是增加feature，也不是修复bug)' },
        { value: 'perf', name: 'perf:     性能优化' },
        { value: 'test', name: 'test:     增加测试' },
        { value: 'chore', name: 'chore:    构建过程或辅助工具的变动' },
        { value: 'revert', name: 'revert:   回退' },
        { value: 'build', name: 'build:    打包' },
    ],
    messages: {
        type: '请选择提交类型:',
        customScope: '请输入修改范围(可选):',
        subject: '请简要描述提交(必填):',
        body: '请输入详细描述(可选):',
        footer: '请输入要关闭的issue(可选):',
        confirmCommit: '确认使用以上信息提交？(y/n/e/h)',
        breakingChange: '此提交包含 BREAKING CHANGE 吗？',
    },
    subjectLimit: 72,
    // scopes: ['frontend', 'backend', 'api'],
    // allowCustomScopes: true,
    // allowBreakingChanges: ['feat', 'fix'],
    // footerPrefix: 'BREAKING CHANGES:',
    // skipQuestions: [],
};

export class CommitizenPlugin {
    private config: CommitizenConfig;

    constructor(config?: Partial<CommitizenConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 运行交互式流程，生成提交信息。
     * @throws {CommitAbortedError} 如果用户在确认步骤拒绝提交。
     * @returns {Promise<string>} 最终的提交信息字符串。
     */
    async run(): Promise<string> {
        const { type } = await this.promptForType();
        const { scope } = await this.promptForScope(type);
        const { subject } = await this.promptForSubject(type, scope);
        const breakingChange = await this.promptForBreakingChange(type);
        const body = await this.promptForBody();
        const footer = await this.promptForFooter();

        const commitMessage = this.createCommitMessage({
            type,
            scope,
            subject,
            body,
            footer,
            breakingChange,
        });

        return await this.confirmCommit(commitMessage);
    }

    /**
     * 检查是否应该跳过某个问题。
     * @param key 要检查的问题键名。
     * @returns 如果问题被跳过，返回 true。
     */
    private shouldSkip(key: SkipKey | 'type'): boolean {
        // 'type' 是必需的，始终不可跳过
        if (key === 'type') return false;

        // 修复点: 约束 key 的类型，确保与 skipQuestions 数组的元素类型兼容
        return this.config.skipQuestions?.includes(key as SkipKey) ?? false;
    }

    private async promptInput(
        name: string,
        message: string,
        validate?: (input: string) => boolean | string,
    ): Promise<string> {
        const { [name]: result } = await simplePromptInteraction([
            {
                type: 'input',
                name,
                message,
                validate,
            },
        ]);
        return result.trim();
    }

    private async promptList<T extends string = string>(
        name: string,
        message: string,
        choices: { name: string; value: T }[] | T[],
    ): Promise<T> {
        const { [name]: result } = await simplePromptInteraction([
            {
                type: 'list',
                name,
                message,
                choices,
            },
        ]);
        return result;
    }

    private async promptConfirm(
        name: string,
        message: string,
        defaultValue = false,
    ): Promise<boolean> {
        const { [name]: result } = await simplePromptInteraction([
            {
                type: 'confirm',
                name,
                message,
                default: defaultValue,
            },
        ]);
        return result;
    }

    private async promptForType(): Promise<{ type: CommitType }> {
        const type = await this.promptList('type', this.config.messages?.type, this.config.types);
        return { type };
    }

    private async promptForScope(type: CommitType): Promise<{ scope: string }> {
        if (this.shouldSkip('scope')) return { scope: '' };

        const scopes = this.config.scopeOverrides?.[type] || this.config.scopes;
        if (scopes?.length === 0 && !this.config.allowCustomScopes) {
            return { scope: '' };
        }

        const choices = scopes?.map((s) => ({ name: s, value: s })) ?? [];
        if (this.config.allowCustomScopes) {
            choices.push({ name: 'Custom... (自定义)', value: 'Custom...' });
            choices.push({ name: 'None (无作用域)', value: '' });
        } else {
            choices.push({ name: 'None (无作用域)', value: '' });
        }

        const scope = await this.promptList('scope', this.config.messages?.customScope, choices);
        if (scope === 'Custom...') {
            const customScope = await this.promptInput('customScope', '请输入自定义作用域:');
            return { scope: customScope };
        }

        return { scope };
    }

    private async promptForSubject(type: CommitType, scope: string): Promise<{ subject: string }> {
        if (this.shouldSkip('subject')) return { subject: '' };

        const headerPrefix = `${type}${scope ? `(${scope})` : ''}: `;
        const maxSubjectLength = this.config.subjectLimit - headerPrefix.length;

        const subject = await this.promptInput(
            'subject',
            `${this.config.messages?.subject} (限${maxSubjectLength}字符):`,
            (input) => {
                if (input.length === 0) return 'Subject is required';
                if (input.length > maxSubjectLength)
                    return `Subject 超过限制 (${maxSubjectLength} 字符)`;
                return true;
            },
        );
        return { subject };
    }

    private async promptForBreakingChange(type: CommitType): Promise<boolean> {
        if (this.shouldSkip('breakingChange')) return false;
        if (!this.config.allowBreakingChanges?.includes(type)) return false;
        return await this.promptConfirm('breakingChange', this.config.messages?.breakingChange);
    }

    private async promptForBody(): Promise<string | undefined> {
        if (this.shouldSkip('body')) return undefined;
        const body = await this.promptInput('body', this.config.messages?.body);
        return body || undefined;
    }

    private async promptForFooter(): Promise<string | undefined> {
        if (this.shouldSkip('footer')) return undefined;
        const footer = await this.promptInput('footer', this.config.messages?.footer);
        return footer || undefined;
    }

    private createCommitMessage(data: CommitData): string {
        const { type, scope, subject, body, footer, breakingChange } = data ?? {};

        const header = `${type}${scope ? `(${scope})` : ''}: ${subject}`;
        const sections: string[] = [header];

        if (body) sections.push(body);

        if (breakingChange) {
            sections.push(`${this.config.footerPrefix} ${subject}`);
        }

        if (footer) sections.push(footer);

        return sections.join('\n\n');
    }

    /**
     * 确认提交信息，如果用户拒绝，则抛出 CommitAbortedError。
     * @param commitMessage 待确认的提交信息
     * @throws {CommitAbortedError}
     */
    private async confirmCommit(commitMessage: string): Promise<string> {
        const confirmed = await this.promptConfirm(
            'confirm',
            `${this.config.messages?.confirmCommit}\n\n提交信息：\n${commitMessage}\n`,
        );

        if (!confirmed) {
            throw new CommitAbortedError();
        }

        return commitMessage;
    }
}
