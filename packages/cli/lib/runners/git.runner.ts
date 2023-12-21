import to from '@utils/to';
import Runner, { RunnerRunOptions } from './runner.base';

export default class GitRunner {
    private runner: Runner;
    private run(command: string, args: string[] = [], options: RunnerRunOptions = {}) {
        return this.runner.run(`git ${command}`, args, options);
    }

    public async init(silent: boolean = false) {
        const [err] = await to(this.run('init', [], { silent }));
        if (err) {
            throw err;
        }
        return true;
    }

    public async add(file: string, silent: boolean = false) {
        const [err] = await to(this.run('add', [file], { silent }));
        if (err) {
            throw err;
        }
        return true;
    }

    public async commit(message: string, silent: boolean = false) {
        const [err] = await to(this.run('commit', ['-m', message], { silent }));
        if (err) {
            throw err;
        }
        return true;
    }

    public async addRemote(name: string, url: string, silent: boolean = false) {
        const [err] = await to(this.run('remote', ['add', name, url], { silent }));
        if (err) {
            throw err;
        }
        return true;
    }

    public async push(remote: string, branch: string, silent: boolean = false) {
        const [err] = await to(this.run('push', [remote, branch], { silent }));
        if (err) {
            throw err;
        }
        return true;
    }

    public async pull(remote: string, branch: string, silent: boolean = false) {
        const [err] = await to(this.run('pull', [remote, branch], { silent }));
        if (err) {
            throw err;
        }
        return true;
    }
}
