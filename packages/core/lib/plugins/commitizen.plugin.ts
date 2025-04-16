import inquirer from 'inquirer';

type CommitType = string;

interface CommitizenConfig {
    types: { value: CommitType; name: string }[];
    messages: {
        type: string;
        customScope: string;
        subject: string;
        body: string;
        footer: string;
        confirmCommit: string;
        breakingChange: string;
    };
    skipQuestions?: ('type' | 'scope' | 'subject' | 'body' | 'footer' | 'breakingChange')[];
    subjectLimit: number;
    scopes: string[];
    allowCustomScopes: boolean;
    scopeOverrides?: Record<CommitType, string[]>;
    allowBreakingChanges: CommitType[];
    footerPrefix: string;
}

interface CommitData {
    type: CommitType;
    scope: string;
    subject: string;
    body?: string;
    footer?: string;
    breakingChange?: boolean;
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
    scopes: ['frontend', 'backend', 'api'],
    allowCustomScopes: true,
    allowBreakingChanges: ['feat', 'fix'],
    footerPrefix: 'BREAKING CHANGES:',
};

export class CommitizenPlugin {
    private config: CommitizenConfig;

    constructor(config?: Partial<CommitizenConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    async run(): Promise<string> {
        const { type } = await this.promptForType();
        const { scope } = await this.promptForScope(type);
        const { subject } = await this.promptForSubject();
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

    private shouldSkip(key: keyof CommitData | 'breakingChange'): boolean {
        return this.config.skipQuestions?.includes(key as any);
    }

    private async promptInput(
        name: string,
        message: string,
        validate?: (input: string) => boolean | string,
    ): Promise<string> {
        const { [name]: result } = await inquirer.prompt([
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
        const { [name]: result } = await inquirer.prompt([
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
        const { [name]: result } = await inquirer.prompt([
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
        if (this.shouldSkip('type')) throw new Error('提交类型不可跳过');
        const type = await this.promptList('type', this.config.messages.type, this.config.types);
        return { type };
    }

    private async promptForScope(type: CommitType): Promise<{ scope: string }> {
        if (this.shouldSkip('scope')) return { scope: '' };

        const scopes = this.config.scopeOverrides?.[type] || this.config.scopes;
        if (scopes.length === 0 && !this.config.allowCustomScopes) {
            return { scope: '' };
        }

        const choices = [...scopes];
        if (this.config.allowCustomScopes) choices.push('Custom...');

        const scope = await this.promptList('scope', this.config.messages.customScope, choices);
        if (scope === 'Custom...') {
            const customScope = await this.promptInput('customScope', '请输入自定义作用域:');
            return { scope: customScope };
        }

        return { scope };
    }

    private async promptForSubject(): Promise<{ subject: string }> {
        if (this.shouldSkip('subject')) return { subject: '' };
        const subject = await this.promptInput(
            'subject',
            this.config.messages.subject,
            (input) => input.length > 0 || 'Subject is required',
        );
        return { subject };
    }

    private async promptForBreakingChange(type: CommitType): Promise<boolean> {
        if (this.shouldSkip('breakingChange')) return false;
        if (!this.config.allowBreakingChanges.includes(type)) return false;
        return await this.promptConfirm('breakingChange', this.config.messages.breakingChange);
    }

    private async promptForBody(): Promise<string | undefined> {
        if (this.shouldSkip('body')) return undefined;
        const body = await this.promptInput('body', this.config.messages.body);
        return body || undefined;
    }

    private async promptForFooter(): Promise<string | undefined> {
        if (this.shouldSkip('footer')) return undefined;
        const footer = await this.promptInput('footer', this.config.messages.footer);
        return footer || undefined;
    }

    private createCommitMessage(data: CommitData): string {
        const { type, scope, subject, body, footer, breakingChange } = data;

        const header = `${type}${scope ? `(${scope})` : ''}: ${subject}`;
        const sections = [header];

        if (body) sections.push(body);
        if (breakingChange) sections.push(`${this.config.footerPrefix} ${subject}`);
        if (footer) sections.push(footer);

        let message = sections.join('\n\n');
        if (message.length > this.config.subjectLimit) {
            message = `${message.substring(0, this.config.subjectLimit)}...`;
        }

        return message;
    }

    private async confirmCommit(commitMessage: string): Promise<string> {
        const confirmed = await this.promptConfirm(
            'confirm',
            `${this.config.messages.confirmCommit}\n\n提交信息：\n${commitMessage}\n`,
        );
        return confirmed ? commitMessage : undefined;
    }
}
