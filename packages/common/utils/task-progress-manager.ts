import ora from 'ora';
import cliProgress from 'cli-progress';
import { ProgressCallback, ProgressInfo } from '@lania-cli/types';

export class TaskProgressManager {
    private totalMap = new Map<string, number>();
    private completedMap = new Map<string, number>();
    private callbacks: ProgressCallback[] = [];
    private useSpinner = true;
    private useBar = false;

    private spinners = new Map<string, ReturnType<typeof ora>>();
    private bars = new Map<string, cliProgress.SingleBar>();

    private failedGroups = new Set<string>();
    private failMessages = new Map<string, string>();

    constructor(type: 'bar' | 'spinner' = 'spinner') {
        type === 'spinner' ? (this.useSpinner = true) : (this.useBar = true);
    }

    public init(group: string, total: number) {
        if (this.totalMap.has(group)) return;

        this.totalMap.set(group, total);
        this.completedMap.set(group, 0);
        this.failedGroups.delete(group);
        this.failMessages.delete(group);

        if (this.useSpinner) this.createSpinner(group, total);
        if (this.useBar) this.createBar(group, total);

        this.emit(group, this.buildProgress(group)!);
    }

    public updateTotal(group: string, newTotal: number) {
        if (!this.totalMap.has(group)) return;
        this.totalMap.set(group, newTotal);

        const bar = this.bars.get(group);
        if (bar) bar.setTotal(newTotal, this.completedMap.get(group) ?? 0);

        this.emit(group, this.buildProgress(group)!);
    }

    public increment(group: string, amount = 1) {
        if (this.failedGroups.has(group)) return;
        const current = this.completedMap.get(group) ?? 0;
        this.set(group, current + amount);
    }

    public set(group: string, completed: number) {
        console.log(2);
        if (this.failedGroups.has(group)) return;
        this.completedMap.set(group, completed);

        const info = this.buildProgress(group);
        if (info) this.emit(group, info);
    }

    public complete(group: string) {
        console.log(0);
        if (this.failedGroups.has(group)) return;
        const total = this.totalMap.get(group);
        console.log(1);
        if (total !== undefined) {
            this.set(group, total);
        }
    }

    public completeAll() {
        for (const group of this.totalMap.keys()) {
            this.complete(group);
        }
    }

    public fail(group: string, message?: string) {
        if (this.failedGroups.has(group)) return;

        this.failedGroups.add(group);
        if (message) this.failMessages.set(group, message);

        const spinner = this.spinners.get(group);
        if (spinner && spinner.isSpinning) {
            spinner.fail(`[${group}] Failed${message ? ': ' + message : ''}`);
            this.spinners.delete(group);
        }

        this.destroyBar(group);
        this.emit(group, this.buildProgress(group)!);
    }

    public failAll(message?: string) {
        for (const group of this.totalMap.keys()) {
            this.fail(group, message);
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
            if (spinner && spinner.isSpinning) {
                spinner.stop();
            }
            this.spinners.delete(g);

            this.destroyBar(g);
        }
    }

    public getProgress(group: string): ProgressInfo | null {
        return this.buildProgress(group);
    }

    public getAllProgress(): ProgressInfo[] {
        return Array.from(this.totalMap.keys())
            .map((g) => this.buildProgress(g))
            .filter((v): v is ProgressInfo => !!v);
    }

    public onProgress(callback: ProgressCallback) {
        this.callbacks.push(callback);
    }

    // ======================
    // Internal helpers
    // ======================

    private buildProgress(group: string): ProgressInfo | null {
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

    private emit(group: string, info: ProgressInfo) {
        console.log(3);
        // ✅ Spinner 更新
        if (this.useSpinner) {
            const spinner = this.spinners.get(group);
            if (spinner) {
                // ✅ 强制更新一次文本（无论是否 spinning）
                spinner.text = `[${group}] ${info.completed}/${info.total} (${info.percent}%)`;
                if (info.completed >= info.total) {
                    if (!this.useBar) {
                        // ✅ 如果 spinner 还在转，就触发 succeed
                        if (spinner.isSpinning) {
                            spinner.succeed(
                                `[${group}] ${info.completed}/${info.total} (${info.percent}%) Done.`,
                            );
                        } else {
                            // ✅ 没在转，也触发一遍 succeed（保险）
                            spinner.start();
                            spinner.succeed(
                                `[${group}] ${info.completed}/${info.total} (${info.percent}%) Done.`,
                            );
                        }
                    } else {
                        spinner.stop();
                    }
                    this.spinners.delete(group);
                }
            }
        }

        // ✅ Progress bar 更新
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

        // ✅ 回调触发
        for (const cb of this.callbacks) {
            cb(info);
        }
    }

    private createSpinner(group: string, total: number) {
        const spinner = ora({
            text: `[${group}] 0/${total} (0%)`,
            spinner: 'dots',
        }).start();
        this.spinners.set(group, spinner);
    }

    private createBar(group: string, total: number) {
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

    private destroyBar(group: string) {
        const bar = this.bars.get(group);
        if (bar) {
            bar.stop();
            this.bars.delete(group);
        }
    }
}
