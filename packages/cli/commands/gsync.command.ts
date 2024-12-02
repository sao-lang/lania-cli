import inquirer from 'inquirer';
import { LaniaCommand, LaniaCommandActionInterface } from './command.base';
import GitRunner from '@runners/git.runner';
import { ADD_NEW_REMOTE_CHOICE } from '@lib/constants/cli.constant';

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
        await this.handleNeededMessage(message);
        await this.handleNeededRemote(remote, branch);
    }
    private async handleNeededRemote(remote?: string, branch?: string) {
        const promptRemote = await this.getPromptRemote(remote);
        if (!promptRemote) {
            throw new Error('Please select a remote you will push!');
        }
        const branches = await this.git.getBranches();
        const { branch: promptBranch } = await inquirer.prompt({
            name: 'branch',
            message: 'Please select the branch you will push:',
            choices: branches,
            default: branch,
            type: 'checkbox',
        });
        if (!promptBranch) {
            throw new Error('Please select a branch you will push!');
        }
        const needsSetUpstream = await this.git.needsSetUpstreamOnPushCode();
        needsSetUpstream
            ? await this.git.pushSetUpstream(promptRemote, promptBranch)
            : await this.git.push(promptRemote, promptBranch);
    }
    private async getPromptRemote(remote?: string): Promise<string> {
        const remotes = await this.git.getRemotes();
        const { remote: promptRemote } = await inquirer.prompt({
            name: 'remote',
            message: 'Please select the remote you will push:',
            choices: [...remotes.map(({ name }) => name), ADD_NEW_REMOTE_CHOICE],
            default: remote,
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
    private async handleNeededMessage(message) {
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
            { flags: '--set-upstream', description: 'Push code set the remote as upstream.' },
        ],
        alias: '-g',
    };
}
