import {
    LaniaCommand,
    GitRunner,
    CommitizenPlugin,
    CommitlintPlugin,
    logger,
    TaskProgressManager,
    to,
    CLIInteraction,
    LaniaCommandConfig,
    ProgressGroup,
    ProgressStep,
} from '@lania-cli/common';
import {
    SyncActionOptions,
    SubMergeActionOptions,
    LaniaCommandActionInterface,
    SubAddActionOptions,
    SubCommitActionOptions,
    ScopedManager,
} from '@lania-cli/types';

@ProgressGroup('lania:sync:add', { type: 'spinner' }) // 声明这个类属于哪个进度组
class AddAction implements LaniaCommandActionInterface<[SubAddActionOptions]> {
    private git = new GitRunner();
    @ProgressStep('add-files', { total: 1 }) // 手动进度控制
    async handle({ files }: SubAddActionOptions = {}) {
        if (!files?.length) {
            throw new Error('Please enter the files you will add.');
        }
        if (files.length === 1 && files[0] === '.') {
            await this.git.stage.addAllFiles();
            return;
        }
        await this.git.stage.add(files);
    }
}
@LaniaCommandConfig(new AddAction(), {
    name: 'add',
    description: 'Add changes to the staging area.',
    args: ['[files...]'],
    helpDescription: 'display help for command.',
})
class AddCommand extends LaniaCommand {}
@ProgressGroup('lania:sync:merge', { type: 'spinner' })
class MergeAction implements LaniaCommandActionInterface<[SubMergeActionOptions]> {
    private git: GitRunner = new GitRunner();
    @ProgressStep('merge-branch', { total: 1 })
    async handle(options: SubMergeActionOptions = {}): Promise<void> {
        const { branch: selectedBranch, message, strategy, ...rest } = options;
        const promptBranch = await this.getPromptBranch(selectedBranch);
        if (!promptBranch) {
            throw new Error('Please select a branch you will push!');
        }
        const flags = Object.keys(rest).reduce((acc, key: keyof typeof rest) => {
            const value = rest[key];
            if (!value) {
                return acc;
            }
            if (['abort', 'no-ff', 'ff-only', 'no-commit', 'squash'].includes(key)) {
                acc[`--${key}`] = value;
            }
            return acc;
        }, [] as string[]);
        const [err] = await to(this.git.branch.merge(promptBranch, { flags, strategy, message }));
        if (err) {
            throw err;
        }
    }

    private async getPromptBranch(selectedBranch?: string) {
        const branches = await this.git.branch.listLocal();
        if (!selectedBranch) {
            const { branch: promptBranch } = await new CLIInteraction()
                .addQuestion({
                    name: 'branch',
                    message: 'Please select the branch you will merge:',
                    choices: branches.map((branch) => ({ name: branch, value: branch })),
                    type: 'list',
                })
                .execute();
            return promptBranch as string;
        }
        if (!branches.find((branch) => branch === selectedBranch)) {
            throw new Error('The branch you entered was not found!');
        }
        return selectedBranch;
    }
}
@LaniaCommandConfig(new MergeAction(), {
    name: 'merge',
    description: 'Used for git branch merging.',
    options: [
        {
            flags: '--no-ff',
            description:
                'Create a merge commit even when the merge could be resolved as a fast-forward.',
            defaultValue: false,
        },
        {
            flags: '--ff-only',
            description: 'Refuse to merge unless the merge can be resolved as a fast-forward.',
            defaultValue: false,
        },
        {
            flags: '--squash',
            description:
                'Combine all commits from the branch into a single commit without creating a merge commit.',
            defaultValue: false,
        },
        {
            flags: '--no-commit',
            description:
                'Perform the merge but do not automatically create a commit, allowing you to inspect or modify changes first.',
            defaultValue: false,
        },
        {
            flags: '--abort',
            description:
                'Abort the current in-progress merge and revert back to the pre-merge state.',
            defaultValue: false,
        },
        {
            flags: '-s, --strategy [strategy]',
            description: 'Specify merge strategy (e.g., recursive, ours, theirs).',
        },
        {
            flags: '-m, --message [message]',
            description: 'Commit message for the merge.',
        },
    ],
    args: ['<branch>'],
    helpDescription: 'display help for command.',
    overrideNoPrefixParsing: true,
})
class MergeCommand extends LaniaCommand {}

class CommitAction implements LaniaCommandActionInterface<[SubCommitActionOptions]> {
    async handle(options: SubCommitActionOptions = {}) {
        console.log(options, 'options');
    }
}
@LaniaCommandConfig(new CommitAction(), {
    name: 'commit',
    description: 'Commit changes to the workspace.',
    options: [
        {
            flags: '-m, --message <message>',
            description: 'The message you need to submit.',
        },
    ],
    helpDescription: 'display help for command.',
})
class CommitCommand extends LaniaCommand {}

@ProgressGroup('lania:sync', { type: 'spinner' })
class SyncAction implements LaniaCommandActionInterface<[SyncActionOptions]> {
    private git = new GitRunner();
    private __progressManager: ScopedManager;
    public async handle(options: SyncActionOptions) {
        const isInstalled = await this.git.git.isInstalled();
        if (!isInstalled) {
            throw new Error('Please install Git first!');
        }
        const isInit = await this.git.git.isInit();
        if (!isInit) {
            await this.git.git.init();
        }
        await this.git.stage.addAllFiles();
        const isClean = await this.git.workspace.isClean();
        const noUnpushedCommits = !(await this.git.branch.hasUnpushedCommits());
        if (isClean && noUnpushedCommits) {
            logger.error('There are no files to sync!');
            process.exit(0);
            return;
        }
        const currentBranch = await this.git.branch.getCurrent();
        const { message, remote, branch = currentBranch, normatively } = options;
        if (!normatively) {
            if (!isClean) {
                const promptMessage = await this.getPromptMessage(message);
                if (!promptMessage) {
                    throw new Error('Please input the message you will commit!');
                }
                await this.git.workspace.commit(promptMessage);
            }
            await this.handlePush(remote, branch);
            return;
        }
        const commitMessage = await new CommitizenPlugin().run();
        const lintResult = await new CommitlintPlugin({
            rules: {
                'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style']], // ✅ 合法
            },
        } as Record<string, any>).run(commitMessage);
        lintResult.errors.forEach((error) => {
            logger.error(error.message);
        });
        lintResult.warnings.forEach((warning) => {
            logger.warn(warning.message);
        });
        if (lintResult.errors.length) {
            process.exit(0);
        }
        await this.git.workspace.commit(commitMessage);
        await this.handlePush(remote, branch);
    }
    @ProgressStep('push-code', { total: 1, manual: true })
    private async handlePush(remote?: string, branch?: string) {
        const promptRemote = await this.getPromptRemote(remote);
        if (!promptRemote) {
            throw new Error('Please select a remote you will push!');
        }
        const promptBranch = await this.getPromptBranch(branch);
        if (!promptBranch) {
            throw new Error('Please select a branch you will push!');
        }
        this.__progressManager.init();
        const [err] = await to<void, Error>(
            (async () => {
                const needsSetUpstream = await this.git.branch.needSetUpstream();
                needsSetUpstream
                    ? await this.git.branch.setUpstream(promptRemote, promptBranch)
                    : await this.git.remote.push(promptRemote, promptBranch);
            })(),
        );
        if (!err) {
            throw err;
        }
        // this.__progressManager.increment();
        this.__progressManager.complete();
    }
    private async getPromptBranch(selectedBranch?: string) {
        const branches = await this.git.branch.listLocal();
        if (!selectedBranch) {
            const { branch: promptBranch } = await new CLIInteraction()
                .addQuestion({
                    name: 'branch',
                    message: 'Please select the branch you will push:',
                    choices: branches.map((branch) => ({ name: branch, value: branch })),
                    type: 'list',
                })
                .execute();
            return promptBranch as string;
        }
        if (!branches.find((branch) => branch === selectedBranch)) {
            throw new Error('The branch you entered was not found!');
        }
        return selectedBranch;
    }
    private async getPromptRemote(selectedRemote?: string) {
        const remotes = await this.git.remote.list();
        if (!remotes.length) {
            throw new Error('You haven\'t added a remote yet');
        }
        if (!selectedRemote) {
            const { remote: promptRemote } = await new CLIInteraction()
                .addQuestion({
                    name: 'remote',
                    message: 'Please select the remote you will push:',
                    choices: remotes.map(({ name }) => ({ name, value: name })),
                    type: 'list',
                })
                .execute();
            return promptRemote as string;
        }
        if (!remotes.find(({ name }) => name === selectedRemote)) {
            throw new Error('The remote you entered was not found!');
        }
        return selectedRemote;
    }
    private async getPromptMessage(inputMessage?: string) {
        if (!inputMessage) {
            const { message } = await await new CLIInteraction()
                .addQuestion({
                    name: 'message',
                    message: 'Please input the message you will commit:',
                    type: 'input',
                })
                .execute();
            return message;
        }
        return inputMessage;
    }
}

@LaniaCommandConfig(
    new SyncAction(),
    {
        name: 'sync',
        description: 'One-click operation of git push code.',
        options: [
            { flags: '-m, --message [message]', description: 'Message when code is committed.' },
            { flags: '-b, --branch [branch]', description: 'Branch when code is pushed.' },
            { flags: '-n, --normatively', description: 'Whether to normalize submission message.' },
            { flags: '-r, --remote [remote]', description: 'Remote when code is pushed.' },
        ],
        alias: '-g',
    },
    [new MergeCommand(), new AddCommand(), new CommitCommand()],
)
export class SyncCommand extends LaniaCommand {}

// class CheckoutAction implements LaniaCommandActionInterface<[SubAddActionOptions]> {
//     async handle() {}
// }

// @LaniaCommandConfig(CheckoutAction, {
//     name: 'checkout',
//     description: 'One-click operation of git push code.',
// })
// class CheckoutCommand extends LaniaCommand {}
