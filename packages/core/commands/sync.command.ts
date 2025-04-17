import inquirer from 'inquirer';
import { LaniaCommand } from './command.base';
// import GitRunner from '@runners/git.runner';
import { GitRunner } from '@runners/git.runner.new';
import loading from '@utils/loading';
import { CommitizenPlugin } from '@lib/plugins/commitizen.plugin';
import { CommitlintPlugin } from '@lib/plugins/commitlint.plugin';
import logger from '@utils/logger';
import { SyncActionOptions, LaniaCommandActionInterface } from '@lania-cli/types';

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
        // await this.handleCommit(message);
        console.log('flag');
        const flag = await this.git.workspace.isClean();
        if (!flag) {
            return;
        }
        const currentBranch = await this.git.branch.getCurrent();
        const { message, remote = 'origin', branch = currentBranch, normatively } = options;
        if (!normatively) {
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
            await this.git.workspace.commit(messagePromptRes.message);
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
            logger.warning(warning.message);
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
        const promptBranch = await this.getPromptBranch();
        if (!promptBranch) {
            throw new Error('Please select a branch you will push!');
        }
        const noCommits = await this.git.branch.hasPushedCommitsEqual(remote, branch);
        if (noCommits) {
            throw new Error('No commits to push.');
        }
        loading('Start to push code', async () => {
            try {
                const needsSetUpstream = await this.git.remote.needSetUpstream();
                needsSetUpstream
                    ? await this.git.remote.setUpstream(promptRemote, promptBranch)
                    : await this.git.remote.push(promptRemote, promptBranch);
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
    private async getPromptBranch(selectedBranch?: string) {
        const branches = await this.git.branch.listLocal();
        if (!selectedBranch) {
            const { branch: promptBranch } = await inquirer.prompt({
                name: 'branch',
                message: 'Please select the branch you will push:',
                choices: branches.map((branch) => ({ name: branch, value: branch })),
                type: 'checkbox',
            });
            return promptBranch as string;
        }
        if (!branches.find((branch) => branch === selectedBranch)) {
            throw new Error('The branch you entered was not found!');
        }
        return selectedBranch;
    }
    private async getPromptRemote(selectedRemote?: string) {
        const remotes = await this.git.remote.list();
        if (!selectedRemote) {
            const { remote: promptRemote } = await inquirer.prompt({
                name: 'remote',
                message: 'Please select the remote you will push:',
                choices: remotes.map(({ name }) => ({ name, value: name })),
                type: 'checkbox',
            });
            return promptRemote as string;
        }
        if (!remotes.find(({ name }) => name === selectedRemote)) {
            throw new Error('The remote you entered was not found!');
        }
        return selectedRemote;
    }
}

export default class SyncCommand extends LaniaCommand<[SyncActionOptions]> {
    protected actor = new SyncAction();
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
