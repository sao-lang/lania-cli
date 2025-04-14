import ora from 'ora';
import cliProgress from 'cli-progress';

type ProgressInfo = { group: string; completed: number; total: number; percent: number };

type ProgressCallback = (info: ProgressInfo) => void;

export class TaskProgressManager {
    private totalMap = new Map<string, number>();
    private completedMap = new Map<string, number>();
    private callbacks: ProgressCallback[] = [];
    private spinners = new Map<string, ReturnType<typeof ora>>();
    private bars = new Map<string, cliProgress.SingleBar>();

    constructor(
        private useSpinner = true,
        private useBar = false,
    ) {}

    init(group: string, total: number) {
        this.totalMap.set(group, total);
        this.completedMap.set(group, 0);

        if (this.useSpinner && !this.spinners.has(group)) {
            const spinner = ora({ text: `[${group}] 0/${total} (0%)`, spinner: 'dots' }).start();
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

    increment(group: string, amount: number = 1) {
        const current = this.completedMap.get(group) || 0;
        this.completedMap.set(group, current + amount);
        this.emit(group);
    }

    add(amount: number, group: string) {
        this.increment(group, amount);
    }

    set(group: string, completed: number) {
        this.completedMap.set(group, completed);
        this.emit(group);
    }

    getProgress(group: string): ProgressInfo | null {
        const total = this.totalMap.get(group);
        const completed = this.completedMap.get(group);
        if (total === undefined || completed === undefined) return null;
        return {
            group,
            completed,
            total,
            percent: total === 0 ? 100 : Math.round((completed / total) * 100),
        };
    }

    getAllProgress(): ProgressInfo[] {
        const groups = Array.from(this.totalMap.keys());
        return groups.map((group) => this.getProgress(group)!).filter(Boolean);
    }

    onProgress(callback: ProgressCallback) {
        this.callbacks.push(callback);
    }

    private emit(group: string) {
        const info = this.getProgress(group);
        if (!info) return;

        if (this.useSpinner) {
            const spinner = this.spinners.get(group);
            if (spinner) {
                spinner.text = `[${group}] ${info.completed}/${info.total} (${info.percent}%)`;
                if (info.completed >= info.total) spinner.succeed(`[${group}] Done.`);
            }
        }

        if (this.useBar) {
            const bar = this.bars.get(group);
            if (bar) {
                bar.update(info.completed);
                if (info.completed >= info.total) bar.stop();
            }
        }

        for (const cb of this.callbacks) {
            cb(info);
        }
    }

    reset(group?: string) {
        const groups = group ? [group] : Array.from(this.totalMap.keys());
        for (const g of groups) {
            this.totalMap.delete(g);
            this.completedMap.delete(g);

            const spinner = this.spinners.get(g);
            if (spinner) spinner.stop();
            this.spinners.delete(g);

            const bar = this.bars.get(g);
            if (bar) bar.stop();
            this.bars.delete(g);
        }
    }
}
