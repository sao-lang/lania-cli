import { to } from '../../utils/to';
import { Runner } from './runner.base'; // 假设 Runner 基类存在
import path from 'path';
import fs from 'fs/promises'; // 引入 fs.promises 异步 API
import { constants } from 'fs';
import { RunnerRunOptions } from '@lania-cli/types'; // 假设类型定义存在

// ----------------------------------------------------------------------
// 辅助函数
// ----------------------------------------------------------------------

/**
 * 安全地将字符串用双引号包裹，并转义内部的双引号。
 * @param message 待包裹的字符串
 * @returns 经过引号包裹的字符串
 */
const quoteMessage = (message: string): string => {
    return `"${message.replace(/"/g, '\\"')}"`;
};

// ----------------------------------------------------------------------
// GitBranch (分支操作)
// ----------------------------------------------------------------------

class GitBranch extends Runner<'git'> {
    constructor() {
        super('git');
    }

    // 获取当前分支 (修复：使用异步文件操作)
    public async getCurrent(): Promise<string | null> {
        const cwd = process.cwd();
        let gitDir = path.join(cwd, '.git');

        try {
            // 尝试读取 .git 目录信息
            const gitStat = await fs.lstat(gitDir);

            // 如果 .git 是一个文件 (worktree/submodule)
            if (gitStat.isFile()) {
                const content = (await fs.readFile(gitDir, 'utf-8')).trim();
                const match = content.match(/^gitdir: (.+)$/);
                if (match) {
                    gitDir = path.resolve(cwd, match[1]);
                }
            }
        } catch (e) {
            // .git 目录不存在，不是仓库
            return null;
        }

        const headPath = path.join(gitDir, 'HEAD');

        try {
            const headContent = (await fs.readFile(headPath, 'utf-8')).trim();
            const match = headContent.match(/^ref: refs\/heads\/(.+)$/);
            return match ? match[1] : null; // null 表示 detached HEAD 或无法识别
        } catch (e) {
            return null; // HEAD 文件不存在
        }
    }

    // 列出所有本地分支 (优化：使用 --format 获取干净输出)
    public async listLocal(): Promise<string[]> {
        // 使用 --format="%(refname:short)" 确保只返回分支名
        const result = await this.run('branch', ['--list', '--format=%\(refname:short\)']);
        return result.split('\n').filter(Boolean);
    }

    // 列出所有远程分支 (优化：使用 --format 获取干净输出)
    public async listRemote(): Promise<string[]> {
        // 使用 -r 和 --format
        const result = await this.run('branch', ['-r', '--list', '--format=%\(refname:short\)']);
        // 远程分支格式为 'remote/branch'，这里不再需要额外的 `replace` 清理
        return result.split('\n').filter(Boolean);
    }

    // 创建并切换到新分支
    public async create(branchName: string) {
        // 建议使用 switch，因为它更现代
        await this.run('switch', ['-c', branchName]);
    }

    // 删除本地分支
    public async delete(branchName: string, force = false) {
        await this.run('branch', [force ? '-D' : '-d', branchName]);
    }

    // 切换到分支
    public async switch(branchName: string) {
        await this.run('checkout', [branchName]); // 仍兼容 checkout
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
        return branches.some((b) => b.endsWith(`/${branch}`)); // 远程分支名包含 remote/
    }

    public async exists(branch: string) {
        const { local, remote } = await this.listAll();
        return local.includes(branch) || remote.some((b) => b.endsWith(`/${branch}`));
    }

    // 合并一个分支 (修复：避免字符串拼接)
    public async merge(
        branch: string,
        {
            flags = [],
            strategy,
            message,
        }: { flags?: string[]; strategy?: string; message?: string } = {},
    ) {
        const args: string[] = [];

        if (strategy) {
            args.push('-s', strategy); // 分开传递参数和值
        }
        if (message) {
            args.push('-m', quoteMessage(message)); // 确保消息被引用
        }

        args.push(branch, ...flags);

        await this.run('merge', args.filter(Boolean));
    }

    // 合并并解决冲突（自动合并）
    public async mergeNoFF(branch: string) {
        await this.run('merge', ['--no-ff', branch]);
    }

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

    // 执行 rebase 操作
    public async rebase(
        targetBranch: string,
        {
            interactive = false,
            onto,
            root = false,
        }: {
            interactive?: boolean;
            onto?: string;
            root?: boolean;
        } = {},
    ) {
        const args: string[] = [];
        if (interactive) {
            args.push('-i');
        }
        if (root) {
            args.push('--root');
        }
        if (onto) {
            args.push('--onto', onto);
        }
        args.push(targetBranch);

        await this.run('rebase', args.filter(Boolean));
    }

    public async abortRebase() {
        await this.run('rebase', ['--abort']);
    }

    public async continueRebase() {
        await this.run('rebase', ['--continue']);
    }

    public async skipRebase() {
        await this.run('rebase', ['--skip']);
    }

    // ... hasUnpushedCommits 和 needSetUpstream 逻辑保持不变，但仍建议未来优化
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
            // 注意：run 传入单个字符串命令，假设底层能正确解析
            await this.run('rev-parse', ['--abbrev-ref', '--symbolic-full-name', '@{u}']);
            return false;
        } catch (e) {
            return true;
        }
    }

    public async setUpstream(remote: string, branch: string) {
        await this.run('push', ['--set-upstream', remote, branch]);
    }
}

// ----------------------------------------------------------------------
// GitRemote (远程仓库)
// ----------------------------------------------------------------------

class GitRemote extends Runner<'git'> {
    constructor() {
        super('git');
    }

    public async list() {
        // 使用 -v 和 --format="%(name) %(url:push)" 获取更可靠的解析
        const result = await this.run('remote', ['-v']);
        if (!result) {
            return [];
        }
        // 原始解析逻辑看起来合理，继续沿用，但注意 result 可能是空字符串
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

    public async add(name: string, url: string) {
        await this.run('remote', ['add', name, url]);
    }

    public async exists(name: string) {
        const remotes = await this.list();
        return remotes.some((remote) => remote.name === name);
    }

    public async push(remote: string, branch: string) {
        await this.run('push', [remote, branch]);
    }

    public async pull(remote: string, branch: string) {
        await this.run('pull', [remote, branch]);
    }

    public async status(remote: string) {
        const result = await this.run('ls-remote', [remote]);
        return result;
    }
}

// ----------------------------------------------------------------------
// GitStage (暂存区)
// ----------------------------------------------------------------------

class GitStage extends Runner<'git'> {
    constructor() {
        super('git');
    }

    public async getFiles() {
        const output = await this.run('diff', ['--name-only', '--cached']);
        return output.split('\n').filter(Boolean);
    }

    // 添加文件到暂存区 (修复：将文件数组作为单独的参数传递)
    public async add(files: string | string[]) {
        const normalizedFiles = typeof files === 'string' ? [files] : files;
        // 修复：将数组元素作为独立的参数传递
        await this.run('add', normalizedFiles);
    }

    public async addAllFiles() {
        await this.add('.');
    }

    public async reset(file: string) {
        await this.run('reset', [file]);
    }

    public async diff() {
        const output = await this.run('diff', ['--cached']);
        return output.trim();
    }
}

// ----------------------------------------------------------------------
// GitWorkspace (工作区)
// ----------------------------------------------------------------------

class GitWorkspace extends Runner<'git'> {
    constructor() {
        super('git');
    }

    public async getChangedFiles() {
        const output = await this.run('diff', ['--name-only']);
        return output?.split('\n')?.filter(Boolean) ?? [];
    }

    public async status() {
        const output = await this.run('status', ['--porcelain']);
        return output.trim();
    }

    public async isClean() {
        const status = await this.status();
        return status.length === 0;
    }

    // 提交代码 (已修复：确保消息被引用，以防 pathspec 错误)
    public async commit(message: string) {
        // 使用辅助函数确保消息被正确引用和转义
        const quotedMessage = quoteMessage(message);
        await this.run('commit', ['-m', quotedMessage]);
    }

    public async getLastCommitMessage() {
        const message = await this.run('log', ['-1', '--pretty=%B']);
        return message.trim();
    }

    public async getLastCommitHash() {
        const hash = await this.run('log', ['-1', '--pretty=%H']);
        return hash.trim();
    }

    public async getCommitFiles(commitHash: string) {
        const files = await this.run('show', ['--name-only', commitHash]);
        // show --name-only 会输出提交信息，需要过滤
        return files?.split('\n').filter((line) => line.trim() && !line.startsWith('commit')) ?? [];
    }

    // 通用的获取提交日志方法
    public async getCommitLog(
        options: {
            limit?: number;
            author?: string;
            date?: [string, string];
            commit?: [string, string];
            showOneline?: boolean;
            format?: string;
        } = {},
    ) {
        const args: string[] = [];

        if (options.limit !== undefined) {
            // 修复：使用单独的参数传递，避免字符串拼接
            args.push('-n', options.limit.toString());
        }
        if (options.commit) {
            args.push(`${options.commit[0]}..${options.commit[1]}`);
        }
        if (options.author) {
            args.push('--author', options.author);
        }
        if (options.date) {
            args.push(`--since=${options.date[0]}`, `--until=${options.date[1]}`);
        }
        if (options.showOneline) {
            args.push('--oneline');
        }
        if (options.format) {
            args.push(`--pretty=${options.format}`);
        }

        const log = await this.run('log', args);

        // 原始的解析逻辑不适用于所有格式，但如果 format 未指定，依赖 --oneline 的解析
        return log
            .split('\n')
            .map((line) => {
                if (!line.trim()) return null;
                const [hash, ...message] = line.split(' ');
                return { hash, message: message.join(' ') };
            })
            .filter(Boolean);
    }

    // 撤销一个或多个提交的更改 (Revert)
    public async revert(
        commitHash: string | string[],
        {
            noCommit = false,
            mainline,
            // 💡 增加 noEdit 选项，允许用户跳过编辑器
            noEdit = false,
        }: {
            noCommit?: boolean;
            mainline?: number;
            noEdit?: boolean;
        } = {},
    ) {
        const hashes = Array.isArray(commitHash) ? commitHash : [commitHash];
        const args: string[] = [];

        if (noCommit) {
            args.push('--no-commit');
        }
        if (noEdit) {
            args.push('--no-edit');
        }
        if (mainline) {
            args.push('-m', mainline.toString());
        }

        // 如果没有提供 --no-edit，Git 会自动打开编辑器，这是理想的默认行为。
        await this.run('revert', [...args.filter(Boolean), ...hashes]);
    }

    public async abortRevert() {
        await this.run('revert', ['--abort']);
    }

    public async continueRevert() {
        await this.run('revert', ['--continue']);
    }
}

// ----------------------------------------------------------------------
// GitUser, GitTag, Git
// ----------------------------------------------------------------------

class GitUser extends Runner<'git'> {
    constructor() {
        super('git');
    }

    public async getConfig() {
        const name = (await this.run('config', ['user.name'])).trim();
        const email = (await this.run('config', ['user.email'])).trim();
        return { name, email };
    }

    public async setConfig(name: string, email: string) {
        await this.run('config', ['user.name', name]);
        await this.run('config', ['user.email', email]);
    }
}

class GitTag extends Runner<'git'> {
    constructor() {
        super('git');
    }

    public async list() {
        const result = await this.run('tag', []);
        return result?.split('\n')?.filter(Boolean) ?? [];
    }

    public async create(tag: string, message: string) {
        await this.run('tag', [tag, '-m', quoteMessage(message)]);
    }

    public async delete(tag: string) {
        await this.run('tag', ['-d', tag]);
    }
}

class Git extends Runner<'git'> {
    constructor() {
        super('git');
    }

    public async clone(repoUrl: string, targetDir?: string) {
        const args = targetDir ? [repoUrl, targetDir] : [repoUrl];
        await this.run('clone', args);
    }

    public async getVersion() {
        const version = await this.run('version', []);
        return version.trim();
    }

    public async isInstalled() {
        const [err] = await to(this.run('version', []));
        return !err;
    }

    // 检查是否初始化 (修复：使用异步文件操作)
    public async isInit() {
        const gitDir = path.join(process.cwd(), '.git');
        try {
            await fs.access(gitDir, constants.F_OK);
            return true;
        } catch (e) {
            return false;
        }
    }

    public async init(options?: RunnerRunOptions) {
        await this.run('init', [], options);
    }
}

// ----------------------------------------------------------------------
// GitRunner 导出
// ----------------------------------------------------------------------

export class GitRunner extends Runner<'git'> {
    public branch: GitBranch;
    public remote: GitRemote;
    public stage: GitStage;
    public workspace: GitWorkspace;
    public user: GitUser;
    public git: Git;
    public tag: GitTag;

    constructor() {
        super('git');
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

