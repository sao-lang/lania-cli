import { IgnoredInnerRule, IgnoreOptions } from '@lania-cli/types';
import fs from 'fs';
import path from 'path';

export class IgnoreEngine {
    private rules: IgnoredInnerRule[] = [];
    private rootDir: string;

    constructor(options: IgnoreOptions = {}) {
        this.rootDir = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
        this.loadRules(options);
    }

    private loadRules(options: IgnoreOptions) {
        const allLines: string[] = [];

        // 优先处理 ignoreFilePath
        if (options.ignoreFilePath) {
            const absPath = path.resolve(options.ignoreFilePath);
            if (!fs.existsSync(absPath)) {
                throw new Error(`Ignore file not found: ${absPath}`);
            }
            this.rootDir = path.dirname(absPath);
            const content = fs.readFileSync(absPath, 'utf-8');
            allLines.push(...content.split(/\r?\n/));
        }

        // 再处理 ignorePatterns
        if (options.ignorePatterns?.length) {
            allLines.push(...options.ignorePatterns);
        }

        this.rules = this.compileRules(allLines);
    }

    public isIgnored(filePath: string): boolean {
        const absPath = path.resolve(filePath);
        const relativePath = path.relative(this.rootDir, absPath).replace(/\\/g, '/');

        let ignored = false;
        for (const rule of this.rules) {
            const target = relativePath;
            if (rule.regex.test(target)) {
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
                const clean = negative ? raw.slice(1) : raw;
                const fromRoot = clean.startsWith('/');
                const pattern = clean.replace(/^\/+/, '');
                const regex = this.globToRegExp(pattern);
                return { raw, pattern, regex, negative, fromRoot };
            });
    }

    private globToRegExp(glob: string): RegExp {
        let regex = '';
        const specialChars = new Set([
            '\\',
            '.',
            '[',
            ']',
            '{',
            '}',
            '(',
            ')',
            '+',
            '-',
            '^',
            '$',
            '|',
        ]);

        const consumeDoubleStar = (i: number): [string, number] => {
            const nextChar = glob[i + 2];
            if (nextChar === '/' || nextChar === undefined) {
                return ['(?:.*/)?', 3];
            }
            return ['.*', 2];
        };

        let i = 0;
        while (i < glob.length) {
            const char = glob[i];
            const handlers: Record<string, () => [string, number]> = {
                '*': () => {
                    if (glob[i + 1] === '*') {
                        return consumeDoubleStar(i);
                    }
                    return ['[^/]*', 1];
                },
                '?': () => ['[^/]', 1],
            };

            if (char in handlers) {
                const [pattern, step] = handlers[char]();
                regex += pattern;
                i += step;
                continue;
            }

            if (specialChars.has(char)) {
                regex += '\\' + char;
                i++;
                continue;
            }

            regex += char;
            i++;
        }

        if (glob.endsWith('/')) {
            regex += '.*';
        }

        return new RegExp('^' + regex + '$');
    }
}
