import { IgnoredInnerRule, IgnoreOptions } from '@lania-cli/types';
import fs from 'fs';
import path from 'path';

// 辅助函数：将路径分隔符标准化为 POSIX 风格
function normalizePath(p: string): string {
    return p.replace(/\\/g, '/');
}

export class IgnoreEngine {
    private rules: IgnoredInnerRule[] = [];
    private rootDir: string;

    constructor(options: IgnoreOptions = {}) {
        // 确保 rootDir 的优先级：如果 options.rootDir 存在，就使用它
        // 否则检查 ignoreFilePath 的目录，最后才使用 process.cwd()
        this.rootDir = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
        this.loadRules(options);
    }

    private loadRules(options: IgnoreOptions) {
        const allLines: string[] = [];
        let effectiveRootDir = this.rootDir;

        // 优先处理 ignoreFilePath
        if (options.ignoreFilePath) {
            const absPath = path.resolve(options.ignoreFilePath);
            if (!fs.existsSync(absPath)) {
                throw new Error(`Ignore file not found: ${absPath}`);
            }
            // 如果用户未显式设置 rootDir，则使用忽略文件所在的目录作为 rootDir
            if (!options.rootDir) {
                effectiveRootDir = path.dirname(absPath);
            }
            const content = fs.readFileSync(absPath, 'utf-8');
            allLines.push(...content.split(/\r?\n/));
        }

        // 应用最终的 rootDir
        this.rootDir = effectiveRootDir;

        // 再处理 ignorePatterns
        if (options.ignorePatterns?.length) {
            allLines.push(...options.ignorePatterns);
        }

        this.rules = this.compileRules(allLines);
    }

    public isIgnored(filePath: string): boolean {
        const absPath = path.resolve(filePath);
        // 标准化相对路径，并确保它是 POSIX 风格
        const relativePath = normalizePath(path.relative(this.rootDir, absPath));

        // 路径如果是 '.'，表示根目录本身，通常不忽略
        if (relativePath === '.') {
            return false;
        }

        let ignored = false;
        // 核心逻辑：顺序遍历规则，后匹配到的规则（包括负向规则）会覆盖前面的状态
        for (const rule of this.rules) {
            if (rule.regex.test(relativePath)) {
                // 如果匹配到规则：
                // 1. 普通规则 (negative=false): 设置为忽略 (ignored = true)
                // 2. 负向规则 (negative=true): 设置为不忽略 (ignored = false)
                ignored = !rule.negative;
            }
        }

        return ignored;
    }

    private compileRules(lines: string[]): IgnoredInnerRule[] {
        return lines
            .map((line) => line.trim())
            .filter((line) => !!line && !line.startsWith('#'))
            .map((raw) => {
                const negative = raw.startsWith('!');
                let clean = negative ? raw.slice(1) : raw;
                // 移除开头的斜杠，但保留信息
                const fromRoot = clean.startsWith('/');
                clean = clean.replace(/^\/+/, '');

                // 目录模式标准化
                const isDirectoryRule = clean.endsWith('/');

                const regex = this.globToRegExp(clean, fromRoot);
                return {
                    raw,
                    pattern: clean,
                    regex,
                    negative,
                    fromRoot,
                    isDirectoryRule,
                } as IgnoredInnerRule;
            });
    }

    /**
     * 将 glob 模式转换为正则表达式，重点处理 Gitignore 的锚定和双星号语义。
     * @param glob
     * @param fromRoot 模式是否从根目录开始（即是否以 '/' 开头）
     */
    private globToRegExp(glob: string, fromRoot: boolean): RegExp {
        let regex = '';
        // 这些字符在 regex 中需要转义，但 '*' 和 '?' 是 glob 特殊字符
        const specialChars = new Set(['\\', '.', '[', ']', '(', ')', '+', '^', '$', '|']);

        // 1. 路径锚定处理
        // 如果模式以 '/' 开头（fromRoot=true），则锚定到路径的起始（^）
        // 如果模式不包含 '/' (且 not fromRoot)，则需要匹配任意深度的路径（先添加 (?:.*/)?）
        if (!fromRoot && !glob.includes('/')) {
            // e.g., 'foo' 应该匹配 'bar/foo'，因此需要前置 (?:.*/)?
            regex += '(?:.*/)?';
        }

        let i = 0;
        while (i < glob.length) {
            const char = glob[i];

            if (char === '*') {
                if (glob[i + 1] === '*') {
                    // 双星号 **
                    if (glob[i + 2] === '/') {
                        // 匹配 **/，表示 0 个或多个目录： (?:.*/)?
                        regex += '(?:.*/)?';
                        i += 3; // 跳过 '**/'
                        continue;
                    }

                    // 匹配 **，通常作为路径的结尾，或位于中间但没有斜杠分隔
                    // 我们简化处理为匹配任意内容 (.*)
                    // 注意：这里仍然是简化的，真正的 Gitignore 语义更复杂
                    regex += '.*';
                    i += 2; // 跳过 '**'
                    continue;
                }

                // 单星号 *：匹配 0 个或多个字符，但不包括斜杠
                regex += '[^/]*';
                i++;
                continue;
            }

            if (char === '?') {
                // 问号 ?：匹配单个字符，但不包括斜杠
                regex += '[^/]';
                i++;
                continue;
            }

            if (specialChars.has(char)) {
                // 转义特殊字符
                regex += '\\' + char;
                i++;
                continue;
            }

            // 普通字符
            regex += char;
            i++;
        }

        // 2. 最终锚定
        // 总是锚定到路径的结尾
        return new RegExp('^' + regex + '$');
    }
}
