import { Command } from 'commander';
import { getLanConfig } from './command.util';
import { LaniaCommand } from './command.base';
import GitRunner from '@runners/git.runner';

type GSyncActionOptions = {
    message?: string;
    branch?: string;
    normatively?: boolean;
    remote?: string;
};

class GSyncAction {
    public async handle({ message, remote }: GSyncActionOptions) {
        const git = new GitRunner();
        const isInstall = await git.isInstall();
        if (!isInstall) {
            throw new Error('Please install Git first!');
        }
        const isInit = await git.isInit();
        if (!isInit) {
            await git.init();
        }
        // const isAddRemote = await git.hasRemote(remote || 'origin');
        // console.log('remotes', await git.lsRemotes());
        // await git.add('.');
        // await git.commit(message);
        // await git.push()
    }
}

export default class GSyncCommand extends LaniaCommand {
    public load(program: Command) {
        program
            .command('gsync')
            .description('One-click operation of git push code.')
            .option('-m, --message [message]', 'Message when code is committed.')
            .option('-b, --branch [branch]', 'Branch when code is pushed.')
            .option('-n, --normatively', 'Whether to normalize submission message.')
            .option('-r, --remote [remote]', 'Remote when code is pushed.')
            // .option('-l, --lint', 'Lint the code when submitting code.')
            // .option('-f, --fix', 'Lint and fix the code when submitting code.')
            .alias('-g')
            .action(async (options) => {
                new GSyncAction().handle(options);
            });
    }
}
