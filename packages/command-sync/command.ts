import {
    LaniaCommand,
    GitRunner,
    CommitizenPlugin,
    CommitlintPlugin,
    logger,
    TaskProgressManager,
    to,
    CLIInteraction,
} from '@lania-cli/common';
import {
    SyncActionOptions,
    MergeActionOptions,
    LaniaCommandActionInterface,
} from '@lania-cli/types';

function toFlag(name: string): string {
    return '--' + name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

class MergeAction implements LaniaCommandActionInterface<[MergeActionOptions]> {
    private git: GitRunner = new GitRunner();
    async handle(options: MergeActionOptions = {}): Promise<void> {
        const { mergedBranch: selectedBranch, ...rest } = options;
        console.log(options, 'options');
        const promptBranch = await this.getPromptBranch(selectedBranch);
        if (!promptBranch) {
            throw new Error('Please select a branch you will push!');
        }
        const flags = Object.keys(rest).reduce((acc, key) => {
            if (rest[key]) {
                acc.push(toFlag(key));
            }
            return acc;
        }, [] as string[]);
        const taskProgressManager = new TaskProgressManager(true, false);
        taskProgressManager.init(`merge from branch: ${promptBranch}`, 1);
        const [err] = await to(this.git.branch.merge(promptBranch, flags));
        if (err) {
            throw err;
        }
        taskProgressManager.completeAll();
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

class MergeCommand extends LaniaCommand {
    protected actor = new MergeAction();
    protected commandNeededArgs = {
        name: 'merge',
        description: 'Used for git branch merging.',
        options: [
            {
                flags: '-m, --merge-branch <branch>',
                description: 'The name of the branch to merge into the current branch.',
            },
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
        ],
        helpDescription: 'display help for command.',
        alias: '-m',
    };
}

class SyncAction implements LaniaCommandActionInterface<[SyncActionOptions]> {
    // private git = new GitRunner();
    private git: GitRunner = new GitRunner();
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
    private async handlePush(remote?: string, branch?: string) {
        const promptRemote = await this.getPromptRemote(remote);
        if (!promptRemote) {
            throw new Error('Please select a remote you will push!');
        }
        const promptBranch = await this.getPromptBranch(branch);
        if (!promptBranch) {
            throw new Error('Please select a branch you will push!');
        }

        const taskProgressManager = new TaskProgressManager(true, false);
        taskProgressManager.init(`Push code: ${promptBranch}`, 1);
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
        taskProgressManager.completeAll();
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
            throw new Error("You haven't added a remote yet");
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

export class SyncCommand extends LaniaCommand {
    protected actor = new SyncAction();
    protected subcommands?: LaniaCommand[] = [new MergeCommand()];
    protected commandNeededArgs = {
        name: 'sync',
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
