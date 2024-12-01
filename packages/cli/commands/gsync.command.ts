import inquirer from 'inquirer';
import { LaniaCommand, LaniaCommandActionInterface } from './command.base';
import GitRunner from '@runners/git.runner';

type GSyncActionOptions = {
    message?: string;
    branch?: string;
    normatively?: boolean;
    remote?: string;
    setUpstream?: boolean;
};

class GSyncAction implements LaniaCommandActionInterface<[GSyncActionOptions]> {
    public async handle({
        message,
        remote = 'origin',
        branch = 'master',
        setUpstream,
    }: GSyncActionOptions) {
        const git = new GitRunner();
        const isInstalled = await git.isInstalled();
        if (!isInstalled) {
            throw new Error('Please install Git first!');
        }
        const isInit = await git.isInit();
        if (!isInit) {
            await git.init();
        }
        await git.addAllFiles();
        const commitPromptRes = await inquirer.prompt({
            name: 'message',
            type: 'input',
            message: 'Please input the message you will commit:',
            default: message,
        });
        const flag = await git.hasUncommittedChanges();
        if (flag) {
            if (!commitPromptRes.message) {
                throw new Error('Please add the message you will commit!');
            }
            await git.commit(commitPromptRes.message);
        }
        // const hasRemote = await git.hasRemote(remote);
        // if (!hasRemote) {
        //     throw new Error(remote ? 'Remote is not exist!' : 'Please add a remote!');
        // }
        // setUpstream ? await git.pushSetUpstream(remote, branch) : git.push(remote, branch);
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
