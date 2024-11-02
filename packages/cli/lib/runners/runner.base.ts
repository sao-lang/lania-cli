import { $ } from 'execa';

export interface RunnerRunOptions {
    silent?: boolean;
    cwd?: string;
}

class BaseRunner {
    public async run(command: string, args: string[] = [], options: RunnerRunOptions = {}) {
        return new Promise((resolve: (value: string) => void, reject) => {
            const isSilent = options.silent === true;
            const $$ = $({
                shell: true,
                stdio: isSilent ? 'pipe' : 'inherit',
                cwd: options.cwd || process.cwd(),
            });
            const childProcess = $$`${command} ${args.join(' ')}`;
            let message = '';
            if (isSilent) {
                childProcess.stdout.on('data', (data) => {
                    message += data.toString().replace(/\r\n|\n/, '\n');
                });
            }
            childProcess.on('error', (err) => {
                return reject(err);
            });
            childProcess.on('close', (code) => {
                if (code === 0) {
                    return resolve(isSilent ? message : null);
                }
                const err = new Error(`Failed to execute command: ${command}`);
                return reject(err);
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
