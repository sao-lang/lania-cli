import to from '@utils/to';
import Runner from './runner.base';
import path from 'path';
import fs from 'fs';
import { RunnerRunOptions } from '@lania-cli/types';

export default class GitRunner extends Runner<'git'> {
    protected command = 'git' as const;
    public async init(options?: RunnerRunOptions) {
        await this.run('init', [], options);
    }

    public async add(file: string, options?: RunnerRunOptions) {
        await this.run('add', [file], options);
        return true;
    }

    public async addAllFiles(options?: RunnerRunOptions) {
        await this.add('.', options);
    }

    public async commit(message: string, options?: RunnerRunOptions) {
        await this.run('commit', ['-m', `"${message}"`], options);
    }

    public async addRemote(name: string, url: string, options?: RunnerRunOptions) {
        await this.run('remote', ['add', name, url], options);
    }

    public async getRemotes() {
        const remotes = await this.run('remote', ['-v']);
        return (
            remotes
                .split('\n')
                .filter((line) => line.trim())
                .map((line) => {
                    const [name, urlWithType] = line.split('\t');
                    const url = urlWithType.replace(/\s\((fetch|push)\)/, '');
                    return { name, url };
                })
                .filter((value, index, self) => {
                    return self.findIndex((v) => v.name === value.name) === index;
                }) ?? []
        );
    }

    public async hasRemote(remote: string) {
        const remotes = await this.getRemotes();
        return remotes.findIndex(({ name }) => name === remote) >= 0;
    }

    public async getBranches(remote: boolean = false) {
        const branches = await this.run('branch', [remote ? '-r' : '']);
        return (
            branches
                .split('\n')
                .map((branch) => branch.trim().replace(/^\* /, ''))
                .filter((branch) => branch.length > 0) ?? []
        );
    }

    public async getCurrentBranch() {
        const branch = await this.run('rev-parse', ['--abbrev-ref', 'HEAD']);
        if (!branch || branch === 'HEAD') {
            throw new Error('Currently not on any branch or in detached HEAD state!');
        }
        return branch.replace(/\n/g, '');
    }

    public async needsSetUpstreamOnPushCode(options?: RunnerRunOptions) {
        const currentBranch = await this.getCurrentBranch();
        // 检查是否已经设置了上游分支
        const upstreamBranch = await this.run(
            'rev-parse',
            [`--abbrev-ref --symbolic-full-name ${currentBranch}@{u}`],
            options,
        );

        if (upstreamBranch) {
            return false; // 已经设置上游分支，不需要 --set-upstream
        }
        // 如果没有上游分支，再检查远程仓库是否已有该分支
        const remote = await this.run('ls-remote', [` --heads origin ${currentBranch}`], options);
        return !remote; // 如果远程没有该分支，则需要 --set-upstream
    }

    public async push(remote: string, branch: string, options?: RunnerRunOptions) {
        await this.run('push', [remote, branch], options);
    }

    public async pushSetUpstream(remote: string, branch: string, options?: RunnerRunOptions) {
        await this.run('push --set-upstream', [remote, branch], options);
    }

    public async pull(remote: string, branch: string, options?: RunnerRunOptions) {
        await this.run('pull', [remote, branch], options);
    }

    public async version(options?: RunnerRunOptions) {
        return await this.run('--version', [], options);
    }

    public async isInstalled(options?: RunnerRunOptions) {
        const [err] = await to(this.version(), options);
        if (err) {
            return false;
        }
        return true;
    }

    public async isInit() {
        return new Promise((resolve: (res: boolean) => void) => {
            const gitDir = path.join(__cwd, '.git');
            fs.access(gitDir, fs.constants.F_OK, (err) => {
                if (err) {
                    return resolve(false);
                }
                return resolve(true);
            });
        });
    }

    public async hasUncommittedChanges() {
        const res = await this.run('status', ['--porcelain']);
        return !!res;
    }

    public async checkIfCommitsCanBePushed(remote: string, branch: string) {
        const res = await this.run('rev-parse', [`${branch}`]);
        const remoteRes = await this.run('rev-parse', [`${remote}/${branch}`]);
        return res?.trim() === remoteRes?.trim();
    }
}
