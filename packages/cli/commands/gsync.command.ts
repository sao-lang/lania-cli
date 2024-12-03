import inquirer from 'inquirer';
import { LaniaCommand, LaniaCommandActionInterface } from './command.base';
import GitRunner from '@runners/git.runner';
import { ADD_NEW_REMOTE_CHOICE } from '@lib/constants/cli.constant';
import logger from '@utils/logger';
import loading from '@utils/loading';

type GSyncActionOptions = {
    message?: string;
    branch?: string;
    normatively?: boolean;
    remote?: string;
    setUpstream?: boolean;
};

class GSyncAction implements LaniaCommandActionInterface<[GSyncActionOptions]> {
    private git = new GitRunner();
    public async handle(options: GSyncActionOptions) {
        const { message, remote = 'origin', branch = 'master' } = options;
        const isInstalled = await this.git.isInstalled();
        if (!isInstalled) {
            throw new Error('Please install Git first!');
        }
        const isInit = await this.git.isInit();
        if (!isInit) {
            await this.git.init();
        }
        await this.git.addAllFiles();
        await this.handleCommit(message);
        await this.handlePush(remote, branch);
    }
    private async handlePush(remote?: string, branch?: string) {
        const promptRemote = await this.getPromptRemote(remote);
        if (!promptRemote) {
            throw new Error('Please select a remote you will push!');
        }
        const branches = await this.git.getBranches();
        const { branch: promptBranch } = await inquirer.prompt({
            name: 'branch',
            message: 'Please select the branch you will push:',
            choices: branches.map((branch) => ({ name: branch, value: branch })),
            default: [branch],
            type: 'checkbox',
        });
        if (!promptBranch) {
            throw new Error('Please select a branch you will push!');
        }
        const noCommits = await this.git.checkIfCommitsCanBePushed(remote, branch);
        if (noCommits) {
            throw new Error('No commits to push.');
        }
        loading('Start to push code', async () => {
            try {
                const needsSetUpstream = await this.git.needsSetUpstreamOnPushCode();
                needsSetUpstream
                    ? await this.git.pushSetUpstream(promptRemote, promptBranch)
                    : await this.git.push(promptRemote, promptBranch);
                return {
                    status: 'succeed',
                    error: null,
                    message: `Sync code successfully, branch: ${branch}, remote: ${remote}.`,
                };
            } catch (e) {
                return {
                    status: 'fail',
                    error: e,
                };
            }
        });
    }
    private async getPromptRemote(remote?: string): Promise<string> {
        const remotes = await this.git.getRemotes();
        const { remote: promptRemote } = await inquirer.prompt({
            name: 'remote',
            message: 'Please select the remote you will push:',
            choices: [...remotes.map(({ name }) => ({ name, value: name })), ADD_NEW_REMOTE_CHOICE],
            default: [remote],
            type: 'checkbox',
        });
        if (promptRemote !== ADD_NEW_REMOTE_CHOICE) {
            return promptRemote;
        }
        const { addRemote } = await inquirer.prompt({
            name: 'addRemote',
            message: 'Please input the remote you will add:',
            type: 'input',
        });
        if (!addRemote) {
            throw new Error('You did not add remote!');
        }
        return addRemote;
    }
    private async handleCommit(message) {
        const flag = await this.git.hasUncommittedChanges();
        if (!flag) {
            return;
        }
        const messagePromptRes = await inquirer.prompt({
            name: 'message',
            message: 'Please input the message you will commit:',
            default: message,
            type: 'input',
        });
        if (!messagePromptRes.message) {
            throw new Error('Please input the message you will commit!');
        }
        // if (flag && !message) {
        //     throw new Error('No committed, Working tree clean!');
        // }
        await this.git.commit(messagePromptRes.message);
    }
}

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

class CommitizenPlugin {
    private config: CommitizenConfig;

    constructor(config: CommitizenConfig) {
        this.config = config;
    }

    // 主要执行的提交流程
    async run(): Promise<void> {
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
        await this.confirmCommit(commitMessage);
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

    private async confirmCommit(commitMessage: string): Promise<void> {
        const { confirmCommit } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmCommit',
                message: `${this.config.messages.confirmCommit}\n\n提交信息: ${commitMessage}`,
                default: true,
            },
        ]);

        if (confirmCommit) {
            console.log(`提交信息: \n${commitMessage}`);
            // 在这里执行 Git 提交命令
            // exec(`git commit -m "${commitMessage}"`, (error, stdout, stderr) => { ... });
        } else {
            console.log('提交已取消');
        }
    }
}

export default class GSyncCommand extends LaniaCommand<[GSyncActionOptions]> {
    protected actor = new GSyncAction();
    protected commandNeededArgs = {
        name: 'gsync',
        description: 'One-click operation of git push code.',
        options: [
            { flags: '-m, --message [message]', description: 'Message when code is committed.' },
            { flags: '-b, --branch [branch]', description: 'Branch when code is pushed.' },
            { flags: '-n, --normatively', description: 'Whether to normalize submission message.' },
            { flags: '-r, --remote [remote]', description: 'Remote when code is pushed.' },
        ],
        alias: '-g',
    };
}
