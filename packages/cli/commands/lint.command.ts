import { Command } from 'commander';
import { getLanConfig } from './command.util';

class LintAction {
    public async handle(linter: string[]) {}
}
export default class LintCommand {
    public load(program: Command) {
        program
            .command('lint')
            .description('Lint the code.')
            .option(
                '-l, --linter <names>',
                'Linter of Lint code.',
                (value, previous) => {
                    return previous.concat([value]);
                },
                [],
            )
            .alias('-l')
            .action(async ({ linter }) => {
                if (linter) {
                    await new LintAction().handle(linter);
                    return;
                }
                const lanConfig = await getLanConfig();
                if (lanConfig || lanConfig.linters) {
                    throw new Error('Please specify the linter');
                }
            });
    }
}
