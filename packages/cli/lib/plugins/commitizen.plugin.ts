import inquirer from 'inquirer';

type CommitType =
    | 'feat'
    | 'fix'
    | 'docs'
    | 'style'
    | 'refactor'
    | 'perf'
    | 'test'
    | 'chore'
    | 'revert'
    | 'build';

interface CommitizenConfig {
    types: { value: CommitType; name: string }[];
    messages: {
        type: string;
        customScope: string;
        subject: string;
        body: string;
        footer: string;
        confirmCommit: string;
    };
    skipQuestions: ('body' | 'footer')[];
    subjectLimit: number;
    scopes: string[];
    allowCustomScopes: boolean;
    allowBreakingChanges: CommitType[];
    footerPrefix: string;
}

interface CommitData {
    type: CommitType;
    scope: string;
    subject: string;
    body?: string;
    footer?: string;
}

export class CommitizenPlugin {
    private config: CommitizenConfig;

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
            },
            skipQuestions: ['body', 'footer'], // 跳过问题
            subjectLimit: 72, // subject 限制长度
            scopes: ['frontend', 'backend', 'api'], // 预定义作用域
            allowCustomScopes: true, // 允许自定义作用域
            allowBreakingChanges: ['feat', 'fix'], // 允许 breaking changes 的类型
            footerPrefix: 'BREAKING CHANGES:', // 修改 breaking change 的前缀
        };
    }

    // 主要执行的提交流程
    async run(cb: (message: string) => (void | Promise<void>)): Promise<void> {
        // 选择提交类型
        const { type } = await this.promptForType();

        // 选择作用域
        const { scope } = await this.promptForScope();

        // 输入提交简要描述
        const { subject } = await this.promptForSubject();

        // 询问是否需要详细描述（可选）
        const body = await this.promptForBody();

        // 询问是否需要关闭的 issue（可选）
        const footer = await this.promptForFooter();

        // 构建提交信息
        const commitMessage = this.createCommitMessage({ type, scope, subject, body, footer });
        // 提交前确认
        const { confirmCommit } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmCommit',
                message: `${this.config.messages.confirmCommit}\n\n提交信息: ${commitMessage}`,
                default: true,
            },
        ]);

        if (confirmCommit) {
            cb(commitMessage);
            console.log(`提交信息: \n${commitMessage}`);
            // 在这里执行 Git 提交命令
            // exec(`git commit -m "${commitMessage}"`, (error, stdout, stderr) => { ... });
        } else {
            console.log('提交已取消');
        }
    }

    private async promptForType(): Promise<{ type: CommitType }> {
        return inquirer.prompt([
            {
                type: 'list',
                name: 'type',
                message: this.config.messages.type,
                choices: this.config.types,
            },
        ]);
    }

    private async promptForScope(): Promise<{ scope: string }> {
        const { scope } = await inquirer.prompt([
            {
                type: 'list',
                name: 'scope',
                message: this.config.messages.customScope,
                choices: [...this.config.scopes, '自定义...'],
            },
        ]);

        return { scope: scope === '自定义...' ? await this.getCustomScope() : scope };
    }

    private async promptForSubject(): Promise<{ subject: string }> {
        return inquirer.prompt([
            {
                type: 'input',
                name: 'subject',
                message: this.config.messages.subject,
                validate: (input: string) => input.length > 0 || '提交简要描述是必填的',
                filter: (input: string) => input.trim(),
            },
        ]);
    }

    private async promptForBody(): Promise<string | undefined> {
        if (this.config.skipQuestions.includes('body')) {
            return '';
        }
        const { bodyInput } = await inquirer.prompt([
            {
                type: 'input',
                name: 'bodyInput',
                message: this.config.messages.body,
                default: '',
            },
        ]);
        return bodyInput.trim() || undefined;
    }

    private async promptForFooter(): Promise<string | undefined> {
        if (this.config.skipQuestions.includes('footer')) {
            return '';
        }
        const { footerInput } = await inquirer.prompt([
            {
                type: 'input',
                name: 'footerInput',
                message: this.config.messages.footer,
                default: '',
            },
        ]);
        return footerInput.trim() || undefined;
    }

    private async getCustomScope(): Promise<string> {
        const { customScope } = await inquirer.prompt([
            {
                type: 'input',
                name: 'customScope',
                message: '请输入自定义范围:',
            },
        ]);
        return customScope;
    }

    private createCommitMessage({ type, scope, subject, body, footer }: CommitData): string {
        let commitMessage = `${type}(${scope}): ${subject}`;
        if (body) {
            commitMessage += `\n\n${body}`;
        }
        if (footer) {
            commitMessage += `\n\n${footer}`;
        }
        return commitMessage;
    }
}
