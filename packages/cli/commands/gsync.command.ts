import inquirer from 'inquirer';
import { LaniaCommand, LaniaCommandActionInterface } from './command.base';
import GitRunner from '@runners/git.runner';
import { ADD_NEW_REMOTE_CHOICE } from '@lib/constants/cli.constant';
import loading from '@utils/loading';
import { CommitizenPlugin } from '@lib/plugins/commitizen.plugin';
import { CommitlintPlugin } from '@lib/plugins/commitlint.plugin';
import logger from '@utils/logger';

type GSyncActionOptions = {
    message?: string;
    branch?: string;
    normatively?: boolean;
    remote?: string;
};

class GSyncAction implements LaniaCommandActionInterface<[GSyncActionOptions]> {
    private git = new GitRunner();
    public async handle(options: GSyncActionOptions) {
        const { message, remote = 'origin', branch = 'master', normatively } = options;
        const isInstalled = await this.git.isInstalled();
        if (!isInstalled) {
            throw new Error('Please install Git first!');
        }
        const isInit = await this.git.isInit();
        if (!isInit) {
            await this.git.init();
        }
        await this.git.addAllFiles();
        // await this.handleCommit(message);
        const flag = await this.git.hasUncommittedChanges();
        if (!flag) {
            return;
        }
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
            await this.git.commit(messagePromptRes.message);
            await this.handlePush(remote, branch);
            return;
        }
        const commitMessage = await new CommitizenPlugin().run();
        const lintResult = await new CommitlintPlugin({
            rules: {
                'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style']], // ✅ 合法
            },
        }).run(commitMessage);
        lintResult.errors.forEach((error) => {
            logger.error(error.message);
        });
        lintResult.warnings.forEach((warning) => {
            logger.warning(warning.message);
        });
        if (lintResult.errors.length) {
            process.exit(0);
        }
        await this.git.commit(commitMessage);
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
