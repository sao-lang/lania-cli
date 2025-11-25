import ora from 'ora';
import cliProgress from 'cli-progress';
import { ProgressCallback, ProgressInfo } from '@lania-cli/types';

// 定义 cliProgress.SingleBar 的类型，因为它在运行时需要实例化
type SingleBar = cliProgress.SingleBar;

export class TaskProgressManager {
    private totalMap = new Map<string, number>();
    private completedMap = new Map<string, number>();
    private callbacks: ProgressCallback[] = [];

    // ⭐️ 优化点 1: 明确声明并初始化为布尔值
    private useSpinner: boolean;
    private useBar: boolean;

    private spinners = new Map<string, ReturnType<typeof ora>>();
    private bars = new Map<string, SingleBar>();

    private failedGroups = new Set<string>();
    private failMessages = new Map<string, string>();

    constructor(type: 'bar' | 'spinner' = 'spinner') {
        // ⭐️ 优化点 1: 明确设置互斥性
        this.useSpinner = type === 'spinner';
        this.useBar = type === 'bar';
    }

    public init(group: string, total: number) {
        // ⭐️ 优化点 4: 确保在初始化新进度之前，清理可能的旧 UI 资源
        this.destroyUI(group);

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
        // 如果 bar 存在，更新其 total
        if (bar) bar.setTotal(newTotal, this.completedMap.get(group) ?? 0);

        this.emit(group, this.buildProgress(group)!);
    }

    public increment(group: string, amount = 1) {
        if (this.failedGroups.has(group)) return;
        const current = this.completedMap.get(group) ?? 0;
        this.set(group, current + amount);
    }

    public set(group: string, completed: number) {
        if (this.failedGroups.has(group)) return;
        this.completedMap.set(group, completed);

        const info = this.buildProgress(group);
        if (info) this.emit(group, info);
    }

    public complete(group: string) {
        if (this.failedGroups.has(group)) return;
        const total = this.totalMap.get(group);
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
            this.spinners.delete(group); // 失败后清理
        } else if (spinner) {
            // 如果 spinner 存在但没在转，也清理掉
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

            this.destroyUI(g);
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

        // ⭐️ 优化点 5: total=0 时百分比设为 100 是可接受的设计，但保留。
        const percent = total === 0 ? 100 : Math.round((completed / total) * 100);

        return {
            group,
            completed,
            total,
            percent,
            failed: this.failedGroups.has(group),
            failMessage: this.failMessages.get(group),
        };
    }

    private emit(group: string, info: ProgressInfo) {
        // ✅ Spinner 更新
        if (this.useSpinner) {
            const spinner = this.spinners.get(group);
            if (spinner) {
                spinner.text = `[${group}] ${info.completed}/${info.total} (${info.percent}%)`;

                // ⭐️ 优化点 3: 简化 Spinner 完成逻辑
                if (info.completed >= info.total) {
                    if (spinner.isSpinning) {
                        spinner.succeed(
                            `[${group}] ${info.completed}/${info.total} (${info.percent}%) Done.`,
                        );
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

    // ⭐️ 优化点 2: 确保只创建一次 Spinner 实例
    private createSpinner(group: string, total: number) {
        if (this.spinners.has(group)) return; // 防止重复创建

        const spinner = ora({
            text: `[${group}] 0/${total} (0%)`,
            spinner: 'dots',
        }).start();
        this.spinners.set(group, spinner);
    }

    // ⭐️ 优化点 2: 确保只创建一次 Bar 实例
    private createBar(group: string, total: number) {
        if (this.bars.has(group)) return; // 防止重复创建

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

    // ⭐️ 新增 helper: 销毁并清理 Spinner
    private destroySpinner(group: string) {
        const spinner = this.spinners.get(group);
        if (spinner && spinner.isSpinning) {
            spinner.stop(); // 停止活动中的 spinner
        }
        this.spinners.delete(group);
    }

    // ⭐️ 优化点 4: 封装销毁 Bar 的逻辑
    private destroyBar(group: string) {
        const bar = this.bars.get(group);
        if (bar) {
            bar.stop();
            this.bars.delete(group);
        }
    }

    // ⭐️ 优化点 4: 统一清理所有 UI 资源
    private destroyUI(group: string) {
        this.destroySpinner(group);
        this.destroyBar(group);
    }
}
