import to from '@utils/to';
import Runner from './runner.base';
import path from 'path';
import fs from 'fs';
import { RunnerRunOptions } from '@lania-cli/types';
class GitBranch {
    constructor(private run: Runner<'git'>['run']) {}
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
    public async merge(branch: string) {
        await this.run('merge', [branch]);
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
    public async abortCurrentCherryPick() {
        await this.run('cherry-pick', ['--abort']);
    }
    public async hasPushedCommitsEqual(remote: string, branch: string) {
        const res = await this.run('rev-parse', [`${branch}`]);
        const remoteRes = await this.run('rev-parse', [`${remote}/${branch}`]);
        return res?.trim() === remoteRes?.trim();
    }
}

class GitRemote {
    constructor(private run: Runner<'git'>['run']) {}
    // 获取所有远程仓库
    public async list() {
        const result = await this.run('remote', ['-v']);
        return result
            .split('\n')
            .map((line) => {
                const [name, urlWithType] = line.split('\t');
                const url = urlWithType.replace(/\s\((fetch|push)\)/, '');
                return { name, url };
            })
            .filter((value, index, self) => self.findIndex((v) => v.name === value.name) === index);
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
    // 设置上游分支
    public async setUpstream(remote: string, branch: string) {
        await this.run('push', ['--set-upstream', remote, branch]);
    }
    // 检查远程仓库的状态
    public async status(remote: string) {
        const result = await this.run('ls-remote', [remote]);
        return result;
    }
    public async needSetUpstream(options?: RunnerRunOptions) {
        const currentBranch = await new GitBranch(this.run).getCurrent();
        // 检查是否已经设置了上游分支
        const upstreamBranch = await this.run(
            'rev-parse',
            ['--abbrev-ref', '--symbolic-full-name', `${currentBranch}@{u}`],
            options,
        );

        if (upstreamBranch) {
            return false; // 已经设置上游分支，不需要 --set-upstream
        }
        // 如果没有上游分支，再检查远程仓库是否已有该分支
        const remote = await this.run('ls-remote', ['--heads', 'origin', currentBranch], options);
        return !remote; // 如果远程没有该分支，则需要 --set-upstream
    }
}

class GitStage {
    constructor(private run: Runner<'git'>['run']) {}
    // 获取暂存区文件
    public async getFiles() {
        const output = await this.run('diff', ['--name-only', '--cached']);
        return output.split('\n').filter(Boolean);
    }
    // 添加文件到暂存区
    public async add(file: string) {
        await this.run('add', [file]);
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

class GitWorkspace {
    constructor(private run: Runner<'git'>['run']) {}
    // 获取工作区文件的差异
    public async getChangedFiles() {
        const output = await this.run('diff', ['--name-only']);
        return output.split('\n').filter(Boolean);
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
        return files.split('\n').filter(Boolean);
    }

    // 通用的获取提交日志方法
    public async getCommitLog(
        options: {
            limit?: number; // 限制日志条数
            from?: string; // 从指定提交开始
            to?: string; // 到指定提交结束
            author?: string; // 按作者筛选提交日志
            fromDate?: string; // 从指定日期开始
            toDate?: string; // 到指定日期结束
            showOneline?: boolean; // 是否以单行显示每个提交
            format?: string; // 定制格式化输出（例如：--pretty=%B）
        } = {},
    ) {
        const args: string[] = [];
        // 根据传入的 options 构建命令行参数
        if (options.limit) {
            args.push(`-n ${options.limit}`);
        }
        if (options.from && options.to) {
            args.push(options.from, options.to);
        } else if (options.from) {
            args.push(options.from);
        } else if (options.to) {
            args.push(options.to);
        }
        if (options.author) {
            args.push('--author', options.author);
        }
        if (options.fromDate || options.toDate) {
            if (options.fromDate) {
                args.push(`--since=${options.fromDate}`);
            }
            if (options.toDate) {
                args.push(`--until=${options.toDate}`);
            }
        }
        if (options.showOneline !== false) {
            args.push('--oneline');
        }
        if (options.format) {
            args.push(`--pretty=${options.format}`);
        }
        // 执行 git log 命令
        const log = await this.run('log', args);

        // 解析提交日志
        return log.split('\n').map((line) => {
            const [hash, ...message] = line.split(' ');
            return { hash, message: message.join(' ') };
        });
    }
}

class GitUser {
    constructor(private run: Runner<'git'>['run']) {}

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

class GitTag {
    constructor(private run: Runner<'git'>['run']) {}
    // 获取所有标签
    public async list() {
        const result = await this.run('tag', []);
        return result.split('\n').filter(Boolean);
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

class Git {
    constructor(private run: Runner<'git'>['run']) {}

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
        this.branch = new GitBranch(this.run);
        this.remote = new GitRemote(this.run);
        this.stage = new GitStage(this.run);
        this.workspace = new GitWorkspace(this.run);
        this.user = new GitUser(this.run);
        this.git = new Git(this.run);
        this.tag = new GitTag(this.run);
    }
}
