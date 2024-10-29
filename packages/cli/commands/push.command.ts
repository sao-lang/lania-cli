import { Command } from 'commander';
import { getLanConfig } from './command.util';

class PushAction {
    public async handle() {}
}

export default class PushCommand {
    public load(program: Command) {
        program
            .command('push')
            .description('One-click operation of git push code.')
            .option('-m, --message [message]', 'Message when code is committed.')
            .option('-b, --branch [branch]', 'Branch when code is pushed.')
            .option('-n, --normatively', 'Whether to normalize submission message.')
            .option('-l, --lint', 'Lint the code when submitting code.')
            .option('-f, --fix', 'Lint and fix the code when submitting code.')
            .alias('-p')
            .action(async ({ message, branch, normatively, lint, fix }) => {
                
            });
    }
}
