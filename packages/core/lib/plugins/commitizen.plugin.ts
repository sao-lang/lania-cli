import inquirer from 'inquirer';

type CommitType = string;

// interface CommitizenConfig {
//     types: { value: CommitType; name: string }[];
//     messages: {
//         type: string;
//         customScope: string;
//         subject: string;
//         body: string;
//         footer: string;
//         confirmCommit: string;
//         breakingChange: string;
//     };
//     skipQuestions: ('type' | 'scope' | 'subject' | 'body' | 'footer' | 'breakingChange')[]; // 可选跳过的问题
//     subjectLimit: number;
//     scopes: string[];
//     allowCustomScopes: boolean;
//     scopeOverrides?: Record<CommitType, string[]>; // 类型特定的作用域覆盖
//     allowBreakingChanges: CommitType[];
//     footerPrefix: string;
// }

interface CommitData {
    type: CommitType;
    scope: string;
    subject: string;
    body?: string;
    footer?: string;
    breakingChange?: boolean;
}

export class CommitizenPlugin {
    private config: Record<string, any>;

    constructor() {
        this.config = {
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
            // skipQuestions: ['body', 'footer', 'breakingChange'], // 跳过 body, footer 和 breakingChange
            subjectLimit: 72,
            scopes: ['frontend', 'backend', 'api'],
            allowCustomScopes: true,
            scopeOverrides: {
                feat: ['Feature A', 'Feature B'],
                fix: ['Bug Fix A', 'Bug Fix B'],
            },
            allowBreakingChanges: ['feat', 'fix'],
            footerPrefix: 'BREAKING CHANGES:',
        };
    }

    async run() {
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

    // 提示选择提交类型
    private async promptForType(): Promise<{ type: CommitType }> {
        if (!this.config?.types?.length) {
            throw new Error('Please set the types config!');
        }
        return inquirer.prompt([
            {
                type: 'list',
                name: 'type',
                message: this.config.messages?.type,
                choices: this.config.types,
            },
        ]);
    }

    // 提示选择提交作用域
    private async promptForScope(type: CommitType): Promise<{ scope: string }> {
        if (this.config.skipQuestions?.includes('scope')) {
            return { scope: '' }; // 跳过作用域
        }

        const scopes = this.config.scopeOverrides?.[type] || this.config.scopes;
        if (scopes.length === 0 && !this.config.allowCustomScopes) {
            return { scope: '' };
        }

        const { scope } = await inquirer.prompt([
            {
                type: 'list',
                name: 'scope',
                message: this.config.messages?.customScope,
                choices: [...scopes, ...(this.config.allowCustomScopes ? ['Custom...'] : [])],
            },
        ]);

        return { scope: scope === 'Custom...' ? await this.getCustomScope() : scope };
    }

    // 提示输入提交简短描述
    private async promptForSubject(): Promise<{ subject: string }> {
        if (this.config.skipQuestions?.includes('subject')) {
            return { subject: '' }; // 跳过简短描述
        }
        return inquirer.prompt([
            {
                type: 'input',
                name: 'subject',
                message: this.config.messages?.subject,
                validate: (input: string) => input.length > 0 || 'Subject is required',
                filter: (input: string) => input.trim(),
            },
        ]);
    }

    // 提示是否包含 Breaking Change
    private async promptForBreakingChange(type: CommitType): Promise<boolean> {
        if (this.config.skipQuestions?.includes('breakingChange')) {
            return false; // 跳过 Breaking Change
        }

        if (this.config.allowBreakingChanges?.includes(type)) {
            const { breakingChange } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'breakingChange',
                    message: this.config.messages?.breakingChange,
                    default: false,
                },
            ]);
            return breakingChange;
        }
        return false;
    }

    // 提示输入详细描述（可选）
    private async promptForBody(): Promise<string | undefined> {
        if (this.config.skipQuestions?.includes('body')) {
            return undefined; // 跳过详细描述
        }
        const { body } = await inquirer.prompt([
            {
                type: 'input',
                name: 'body',
                message: this.config.messages?.body,
            },
        ]);
        return body.trim() || undefined;
    }

    // 提示输入 Footer（可选）
    private async promptForFooter(): Promise<string | undefined> {
        if (this.config.skipQuestions?.includes('footer')) {
            return undefined; // 跳过 Footer
        }
        const { footer } = await inquirer.prompt([
            {
                type: 'input',
                name: 'footer',
                message: this.config.messages?.footer,
            },
        ]);
        return footer.trim() || undefined;
    }

    // 提示自定义作用域
    private async getCustomScope(): Promise<string> {
        const { customScope } = await inquirer.prompt([
            {
                type: 'input',
                name: 'customScope',
                message: '请输入自定义作用域:',
            },
        ]);
        return customScope.trim();
    }

    // 创建提交消息
    private createCommitMessage({
        type,
        scope,
        subject,
        body,
        footer,
        breakingChange,
    }: CommitData): string {
        let message = `${type}${scope ? `(${scope})` : ''}: ${subject}`;

        // 如果有 Breaking Change，在消息的底部加上 BREAKING CHANGE
        if (breakingChange) {
            message += `\n\n${this.config.footerPrefix} ${subject}`;
        }

        // 如果有详细描述，加入到消息中
        if (body) {
            message += `\n\n${body}`;
        }

        // 如果有 footer，加入到消息中
        if (footer) {
            message += `\n\n${footer}`;
        }

        // 处理 Subject 长度限制
        if (message.length > this.config.subjectLimit) {
            message = `${message.substring(0, this.config.subjectLimit)}...`;
        }

        return message;
    }

    // 确认并输出最终的提交消息
    private async confirmCommit(commitMessage: string) {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `${this.config.messages.confirmCommit}\n\n提交信息：\n${commitMessage}\n`,
            },
        ]);
        if (confirm) {
            return commitMessage;
        }
    }
}
