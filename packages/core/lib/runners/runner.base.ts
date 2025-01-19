import { RunnerRunOptions } from '@lania-cli/types';
import { $ } from 'execa';


class BaseRunner {
    public async run(command: string, args: string[] = [], options: RunnerRunOptions = {}) {
        return new Promise((resolve: (value: string) => void, reject) => {
            const { silent = true, cwd } = options;
            const $$ = $({
                shell: true,
                stdio: silent ? 'pipe' : 'inherit',
                cwd: cwd || process.cwd(),
            });
            const childProcess = $$`${command} ${args.join(' ')}`;
            let message = '';
            if (silent) {
                childProcess.stdout.on('data', (data) => {
                    message += data.toString().replace(/\r\n|\n/, '\n');
                });
                childProcess.stderr.on('data', (data: Buffer) => {
                    message += data.toString().replace(/\r\n|\n|\r/, '\n');
                });
            }
            childProcess.on('error', (err) => {
                return reject(err);
            });
            childProcess.on('close', (code) => {
                if (code === 0) {
                    return resolve(silent ? message : null);
                }
                const commandAndArgs = `${command}${args?.length ? ` ${args.join(' ')}` : ''}`;
                const errMsg = silent ? `, from error message: "${message.trimEnd()}"` : '';
                return reject(new Error(`Failed to execute command: ${commandAndArgs}${errMsg}`));
            });
        });
    }
}

export default abstract class Runner<Command extends string> {
    protected abstract command: Command;
    private runner = new BaseRunner();
    protected run(action: string, args: string[] = [], options: RunnerRunOptions = {}) {
        return this.runner.run(`${this.command} ${action}`, args, options);
    }
}
