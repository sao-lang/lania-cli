import ora from 'ora';
import cliProgress from 'cli-progress';
import { ProgressCallback, ProgressInfo } from '@lania-cli/types';

export class TaskProgressManager {
    private totalMap = new Map<string, number>();
    private completedMap = new Map<string, number>();
    private callbacks: ProgressCallback[] = [];
    private spinners = new Map<string, ReturnType<typeof ora>>();
    private bars = new Map<string, cliProgress.SingleBar>();

    private failedGroups = new Set<string>();
    private failMessages = new Map<string, string>();

    constructor(
        private useSpinner = true,
        private useBar = false,
    ) {}

    public init(group: string, total: number) {
        if (!this.totalMap.has(group)) {
            this.totalMap.set(group, total);
            this.completedMap.set(group, 0);
            this.failedGroups.delete(group);
            this.failMessages.delete(group);

            if (this.useSpinner && !this.spinners.has(group)) {
                const spinner = ora({
                    text: `[${group}] 0/${total} (0%)`,
                    spinner: 'dots',
                }).start();
                this.spinners.set(group, spinner);
            }

            if (this.useBar && !this.bars.has(group)) {
                const bar = new cliProgress.SingleBar(
                    {
                        format: `[${group}] [{bar}] {percentage}% | {value}/{total}`,
                        barCompleteChar: '#',
                        barIncompleteChar: '-',
                    },
                    cliProgress.Presets.shades_classic,
                );
                bar.start(total, 0);
                this.bars.set(group, bar);
            }

            this.emit(group);
        }
    }

    /** 动态更新 total，支持进度重新计算 */
    public updateTotal(group: string, newTotal: number) {
        if (this.totalMap.has(group)) {
            this.totalMap.set(group, newTotal);
            // 如果进度条存在，更新其 total
            const bar = this.bars.get(group);
            if (bar) {
                bar.setTotal(newTotal, this.completedMap.get(group) ?? 0);
            }
            this.emit(group);
        }
    }

    public increment(group: string, amount: number = 1) {
        if (this.failedGroups.has(group)) return;
        const current = this.completedMap.get(group) || 0;
        this.completedMap.set(group, current + amount);
        this.emit(group);
    }

    public add(amount: number, group: string) {
        this.increment(group, amount);
    }

    public set(group: string, completed: number) {
        if (this.failedGroups.has(group)) return;
        this.completedMap.set(group, completed);
        this.emit(group);
    }

    public getProgress(group: string): ProgressInfo | null {
        const total = this.totalMap.get(group);
        const completed = this.completedMap.get(group);
        if (total === undefined || completed === undefined) return null;
        return {
            group,
            completed,
            total,
            percent: total === 0 ? 100 : Math.round((completed / total) * 100),
            failed: this.failedGroups.has(group),
            failMessage: this.failMessages.get(group),
        };
    }

    public getAllProgress(): ProgressInfo[] {
        const groups = Array.from(this.totalMap.keys());
        return groups.map((group) => this.getProgress(group)!).filter(Boolean);
    }

    public onProgress(callback: ProgressCallback) {
        this.callbacks.push(callback);
    }

    public complete(group: string) {
        if (this.failedGroups.has(group)) return;
        const total = this.totalMap.get(group);
        if (total !== undefined) {
            this.set(group, total);
            this.emit(group);
        }
    }

    public completeAll() {
        [...this.completedMap.keys()].forEach((key) => this.complete(key));
    }

    public fail(group: string, message?: string) {
        this.failedGroups.add(group);
        if (message) this.failMessages.set(group, message);

        if (this.useSpinner) {
            const spinner = this.spinners.get(group);
            if (spinner) {
                spinner.fail(`[${group}] Failed${message ? ': ' + message : ''}`);
                this.spinners.delete(group);
            }
        }
        if (this.useBar) {
            const bar = this.bars.get(group);
            if (bar) {
                bar.stop();
                this.bars.delete(group);
            }
        }

        this.emit(group);
    }

    public failAll(message?: string) {
        for (const group of this.totalMap.keys()) {
            this.fail(group, message);
        }
    }

    private emit(group: string) {
        const info = this.getProgress(group);
        if (!info) return;

        if (this.failedGroups.has(group)) {
            for (const cb of this.callbacks) {
                cb(info);
            }
            return;
        }

        if (this.useSpinner) {
            const spinner = this.spinners.get(group);
            if (spinner) {
                spinner.text = `[${group}] ${info.completed}/${info.total} (${info.percent}%)`;
                if (info.completed >= info.total) {
                    if (!this.useBar) {
                        spinner.succeed(`[${group}] Done.`);
                        this.spinners.delete(group);
                    } else {
                        spinner.stop();
                        this.spinners.delete(group);
                    }
                }
            }
        }

        if (this.useBar) {
            const bar = this.bars.get(group);
            if (bar) {
                bar.update(info.completed);
                if (info.completed >= info.total) {
                    bar.stop();
                    this.bars.delete(group);
                }
            }
        }

        for (const cb of this.callbacks) {
            cb(info);
        }
    }

    public reset(group?: string) {
        const groups = group ? [group] : Array.from(this.totalMap.keys());
        for (const g of groups) {
            this.totalMap.delete(g);
            this.completedMap.delete(g);
            this.failedGroups.delete(g);
            this.failMessages.delete(g);

            const spinner = this.spinners.get(g);
            if (spinner) spinner.stop();
            this.spinners.delete(g);

            const bar = this.bars.get(g);
            if (bar) bar.stop();
            this.bars.delete(g);
        }
    }
}
