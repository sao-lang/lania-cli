import to from '@utils/to';
import Runner, { RunnerRunOptions } from './runner.base';
import path from 'path';
import fs from 'fs';

export default class GitRunner extends Runner<'git'> {
    protected command = 'git' as const;
    public async init(options?: RunnerRunOptions) {
        await this.run('init', [], options);
    }

    public async add(file: string, options?: RunnerRunOptions) {
        await this.run('add', [file], options);
        return true;
    }

    public async addAllFiles() {
        await this.add('.');
    }

    public async commit(message: string, options?: RunnerRunOptions) {
        await this.run('commit', ['-m', `"${message}"`], options);
    }

    public async addRemote(name: string, url: string, options?: RunnerRunOptions) {
        await this.run('remote', ['add', name, url], options);
    }

    public async lsRemotes() {
        const remotes = await this.run('remote', ['-v']);
        return remotes
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => {
                const [name, urlWithType] = line.split('\t');
                const url = urlWithType.replace(/\s\((fetch|push)\)/, '');
                return { name, url };
            })
            .filter((value, index, self) => {
                return self.findIndex((v) => v.name === value.name) === index;
            });
    }

    public async hasRemote(remote: string) {
        const remotes = await this.lsRemotes();
        return remotes.findIndex(({ name }) => name === remote) >= 0;
    }

    public async push(remote: string, branch: string, options?: RunnerRunOptions) {
        await this.run('push', [remote, branch], options);
    }

    public async pushSetUpstream(remote: string, branch: string, options?: RunnerRunOptions) {
        console.log('git', this);
        await this.run('push --set-upstream', [remote, branch], options);
    }

    public async pull(remote: string, branch: string, options?: RunnerRunOptions) {
        await this.run('pull', [remote, branch], options);
    }

    public async version() {
        return await this.run('--version');
    }

    public async isInstalled() {
        const [err] = await to(this.version());
        if (err) {
            return false;
        }
        return true;
    }

    public async isInit() {
        return new Promise((resolve: (res: boolean) => void) => {
            const gitDir = path.join(process.cwd(), '.git');
            fs.access(gitDir, fs.constants.F_OK, (err) => {
                if (err) {
                    return resolve(false);
                }
                return resolve(true);
            });
        });
    }
}
