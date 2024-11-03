import to from '@utils/to';
import Runner, { RunnerRunOptions } from './runner.base';
import path from 'path';
import fs from 'fs';

export default class GitRunner extends Runner<'git'> {
    protected command = 'git' as const;
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

    public async lsRemotes(){
        const remotes = await this.run('remote', ['-v']);
        return remotes.split('\n');
    }

    public async hasRemote(remote: string){
        const remotes = await this.lsRemotes();
        return remotes.includes(remote);
    }

    public async push(remote: string, branch: string, options?: RunnerRunOptions) {
        await this.run('push', [remote, branch], options);
        return true;
    }

    public async pull(remote: string, branch: string, options?: RunnerRunOptions) {
        await this.run('pull', [remote, branch], options);
        return true;
    }

    public async version() {
        return await this.run('--version');
    }

    public async isInstall() {
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
