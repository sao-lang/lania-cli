import to from '../../utils/to';
import Runner from './runner.base';
import path from 'path';
import fs from 'fs';
import { RunnerRunOptions } from '@lania-cli/types';
class GitBranch extends Runner<'git'> {
    protected command = 'git' as const;
    constructor() {
        super();
    }
    // 获取当前分支
    public async getCurrent() {
        const cwd = process.cwd();
        let gitDir = path.join(cwd, '.git');
        // 如果 .git 是一个文件，解析真实 gitdir 路径（适配 worktree/submodule）
        if (fs.existsSync(gitDir) && fs.lstatSync(gitDir).isFile()) {
            const content = fs.readFileSync(gitDir, 'utf-8').trim();
            const match = content.match(/^gitdir: (.+)$/);
            if (match) {
                gitDir = path.resolve(cwd, match[1]);
            }
        }
        const headPath = path.join(gitDir, 'HEAD');
        if (!fs.existsSync(headPath)) {
            // console.warn('⚠️ 当前目录不是一个 Git 仓库');
            return null;
        }
        const headContent = fs.readFileSync(headPath, 'utf-8').trim();
        const match = headContent.match(/^ref: refs\/heads\/(.+)$/);
        return match ? match[1] : null; // null 表示 detached HEAD 或无法识别
    }
    // 列出所有本地分支
    public async listLocal() {
        const result = await this.run('branch', []);
        return result
            .split('\n')
            .map((line) => line.replace(/^\*?\s*/, ''))
            .filter(Boolean);
    }
    // 列出所有远程分支
    public async listRemote() {
        const result = await this.run('branch', ['-r']);
        return result
            .split('\n')
            .map((line) => line.replace(/^\*?\s*/, ''))
            .filter(Boolean);
    }
    // 创建并切换到新分支
    public async create(branchName: string) {
        await this.run('checkout', ['-b', branchName]);
    }
    // 删除本地分支
    public async delete(branchName: string, force = false) {
        await this.run('branch', [force ? '-D' : '-d', branchName]);
    }
    // 切换到分支
    public async switch(branchName: string) {
        await this.run('checkout', [branchName]);
    }
    // 获取所有分支（包括远程和本地）
    public async listAll() {
        const localBranches = await this.listLocal();
        const remoteBranches = await this.listRemote();
        return { local: localBranches, remote: remoteBranches };
    }
    public async existsLocal(branch: string) {
        const branches = await this.listLocal();
        return branches.includes(branch);
    }
    public async existsRemote(branch: string) {
        const branches = await this.listRemote();
        return branches.includes(branch);
    }
    public async exists(branch: string) {
        const { local, remote } = await this.listAll();
        return [...local, ...remote].includes(branch);
    }
    // 合并一个分支
    public async merge(
        branch: string,
        {
            flags = [],
            strategy,
            message,
        }: { flags?: string[]; strategy?: string; message?: string } = {},
    ) {
        await this.run(
            'merge',
            [
                branch,
                strategy ? `-s ${strategy}` : '',
                message ? `-m ${message}` : '',
                ...flags,
            ].filter(Boolean),
        );
    }
    // 合并并解决冲突（自动合并）
    public async mergeNoFF(branch: string) {
        await this.run('merge', ['--no-ff', branch]);
    }
    // 合并并解决冲突（自动合并）
    public async abortCurrentMerge() {
        await this.run('merge', ['--abort']);
    }
    public async cherryPick(commitHash: string) {
        await this.run('cherry-pick', [commitHash]);
    }
    public async continueCherryPick() {
        await this.run('cherry-pick', ['--continue']);
    }
    public async abortCurrentCherryPick() {
        await this.run('cherry-pick', ['--abort']);
    }
    public async hasUnpushedCommits() {
        try {
            const output = (await this.run('rev-list --count @{u}..')).trim();
            return parseInt(output, 10) > 0;
        } catch (e) {
            if (await this.needSetUpstream()) {
                return true;
            }
            return false;
        }
    }
    public async needSetUpstream() {
        try {
            await this.run('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
            return false; // 有 upstream，不需要设置
        } catch (e) {
            return true; // 没有 upstream，需要设置
        }
    }
    // 设置上游分支
    public async setUpstream(remote: string, branch: string) {
        await this.run('push', ['--set-upstream', remote, branch]);
    }
}

class GitRemote extends Runner<'git'> {
    protected command = 'git' as const;
    constructor() {
        super();
    }
    // 获取所有远程仓库
    public async list() {
        const result = await this.run('remote', ['-v']);
        if (!result) {
            return [];
        }
        return (
            result
                .split('\n')
                ?.filter(Boolean)
                ?.map((line) => {
                    const [name, urlWithType] = line.split('\t');
                    const url = urlWithType.replace(/\s\((fetch|push)\)/, '');
                    return { name, url };
                })
                ?.filter(
                    (value, index, self) => self.findIndex((v) => v.name === value.name) === index,
                ) ?? []
        );
    }
    // 添加远程仓库
    public async add(name: string, url: string) {
        await this.run('remote', ['add', name, url]);
    }
    // 检查是否存在指定的远程仓库
    public async exists(name: string) {
        const remotes = await this.list();
        return remotes.some((remote) => remote.name === name);
    }
    // 推送到远程仓库
    public async push(remote: string, branch: string) {
        await this.run('push', [remote, branch]);
    }
    // 拉取远程仓库的更新
    public async pull(remote: string, branch: string) {
        await this.run('pull', [remote, branch]);
    }
    // 检查远程仓库的状态
    public async status(remote: string) {
        const result = await this.run('ls-remote', [remote]);
        return result;
    }
}

class GitStage extends Runner<'git'> {
    protected command = 'git' as const;
    constructor() {
        super();
    }
    // 获取暂存区文件
    public async getFiles() {
        const output = await this.run('diff', ['--name-only', '--cached']);
        return output.split('\n').filter(Boolean);
    }
    // 添加文件到暂存区
    public async add(files: string | string[]) {
        const normalizedFiles = typeof files === 'string' ? [files] : files;
        await this.run('add', [normalizedFiles.join(' ')]);
    }
    public async addAllFiles() {
        await this.add('.');
    }
    // 移除暂存区文件
    public async reset(file: string) {
        await this.run('reset', [file]);
    }
    // 查看暂存区和工作区之间的差异
    public async diff() {
        const output = await this.run('diff', ['--cached']);
        return output.trim();
    }
}

class GitWorkspace extends Runner<'git'> {
    protected command = 'git' as const;
    constructor() {
        super();
    }
    // 获取工作区文件的差异
    public async getChangedFiles() {
        const output = await this.run('diff', ['--name-only']);
        return output?.split('\n')?.filter(Boolean) ?? [];
    }
    // 获取工作区状态
    public async status() {
        const output = await this.run('status', ['--porcelain']);
        return output.trim();
    }
    // 判断工作区是否干净
    public async isClean() {
        const status = await this.status();
        return status.length === 0;
    }
    // 提交代码
    public async commit(message: string) {
        await this.run('commit', ['-m', message]);
    }
    // 获取最近的提交信息
    public async getLastCommitMessage() {
        const message = await this.run('log', ['-1', '--pretty=%B']);
        return message.trim();
    }
    // 获取最近的提交哈希
    public async getLastCommitHash() {
        const hash = await this.run('log', ['-1', '--pretty=%H']);
        return hash.trim();
    }
    // 获取所有提交的文件
    public async getCommitFiles(commitHash: string) {
        const files = await this.run('show', ['--name-only', commitHash]);
        return files?.split('\n')?.filter(Boolean) ?? [];
    }

    // 通用的获取提交日志方法
    public async getCommitLog(
        options: {
            limit?: number; // 限制日志条数
            author?: string; // 按作者筛选提交日志
            date?: [string, string];
            commit?: [string, string];
            showOneline?: boolean; // 是否以单行显示每个提交
            format?: string; // 定制格式化输出（例如：--pretty=%B）
        } = {},
    ) {
        const map = {
            limit: [`-n ${options.limit}`],
            commit: [options.commit[0], options.commit[1]],
            author: ['--author', options.author],
            date: [`--since=${options.date[0]}`, `--until=${options.date[1]}`],
            showOneline: ['--oneline'],
            format: [`--pretty=${options.format}`],
        };
        const args = Object.keys(map).reduce((acc, key) => {
            if (options[key]) {
                acc.push(map[key]);
            }
            return acc;
        }, [] as string[]);

        // 执行 git log 命令
        const log = await this.run('log', args);

        // 解析提交日志
        return log.split('\n').map((line) => {
            const [hash, ...message] = line.split(' ');
            return { hash, message: message.join(' ') };
        });
    }
}

class GitUser extends Runner<'git'> {
    protected command = 'git' as const;
    constructor() {
        super();
    }

    // 获取 Git 用户配置
    public async getConfig() {
        const name = await this.run('config', ['user.name']);
        const email = await this.run('config', ['user.email']);
        return { name: name.trim(), email: email.trim() };
    }

    // 设置 Git 用户配置
    public async setConfig(name: string, email: string) {
        await this.run('config', ['user.name', name]);
        await this.run('config', ['user.email', email]);
    }
}

class GitTag extends Runner<'git'> {
    protected command = 'git' as const;
    constructor() {
        super();
    }
    // 获取所有标签
    public async list() {
        const result = await this.run('tag', []);
        return result?.split('\n')?.filter(Boolean) ?? [];
    }
    // 创建新标签
    public async create(tag: string, message: string) {
        await this.run('tag', [tag, '-m', message]);
    }
    // 删除标签
    public async delete(tag: string) {
        await this.run('tag', ['-d', tag]);
    }
}

class Git extends Runner<'git'> {
    protected command = 'git' as const;
    constructor() {
        super();
    }

    // 克隆仓库
    public async clone(repoUrl: string, targetDir?: string) {
        const args = targetDir ? [repoUrl, targetDir] : [repoUrl];
        await this.run('clone', args);
    }

    // 获取当前安装的 Git 版本
    public async getVersion() {
        const version = await this.run('version', []);
        return version.trim();
    }

    // 检查是否安装 Git
    public async isInstalled() {
        const [err] = await to(this.run('version', []));
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

    public async init(options?: RunnerRunOptions) {
        await this.run('init', [], options);
    }
}

export class GitRunner extends Runner<'git'> {
    protected command = 'git' as const;
    public branch: GitBranch;
    public remote: GitRemote;
    public stage: GitStage;
    public workspace: GitWorkspace;
    public user: GitUser;
    public git: Git;
    public tag: GitTag;

    constructor() {
        super();
        this.branch = new GitBranch();
        this.remote = new GitRemote();
        this.stage = new GitStage();
        this.workspace = new GitWorkspace();
        this.user = new GitUser();
        this.git = new Git();
        this.tag = new GitTag();
    }
}
export default GitRunner;
