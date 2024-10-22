import Runner, { RunnerRunOptions } from './runner.base';

export default class GitRunner {
    private runner: Runner = new Runner();
    private run(command: string, args: string[] = [], options: RunnerRunOptions = {}) {
        return this.runner.run(`git ${command}`, args, options);
    }

    public async init(options?: RunnerRunOptions) {
        await this.run('init', [], options);
        return true;
    }

    public async add(file: string, options?: RunnerRunOptions) {
        await this.run('add', [file], options);
        return true;
    }

    public async commit(message: string, options?: RunnerRunOptions) {
        await this.run('commit', ['-m', message], options);
        return true;
    }

    public async addRemote(name: string, url: string, options?: RunnerRunOptions) {
        await this.run('remote', ['add', name, url], options);
        return true;
    }

    public async push(remote: string, branch: string, options?: RunnerRunOptions) {
        await this.run('push', [remote, branch], options);
        return true;
    }

    public async pull(remote: string, branch: string, options?: RunnerRunOptions) {
        await this.run('pull', [remote, branch], options);
        return true;
    }
}
