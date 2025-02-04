import ora from 'ora';
import { TaskEvent, TaskStatus } from '@lania-cli/types';

export class ProgressTracker {
    private spinners = new Map<string, ora.Ora>();
    private taskStates = new Map<
        string,
        {
            status: TaskStatus;
            progress: number;
            message?: string;
        }
    >();

    constructor(private showIndividual = true) {}

    update(event: TaskEvent) {
        this.updateTaskState(event);

        if (this.showIndividual) {
            this.updateIndividualSpinner(event);
        }

        this.renderGlobalProgress();
    }

    private updateTaskState(event: TaskEvent) {
        this.taskStates.set(event.taskId, {
            status: event.status,
            progress: event.progress || 0,
            message: event.message,
        });
    }

    private updateIndividualSpinner(event: TaskEvent) {
        let spinner = this.spinners.get(event.taskId);

        if (!spinner && ['running', 'pending'].includes(event.status)) {
            spinner = ora({
                text: this.formatText(event),
                color: 'cyan',
            }).start();
            this.spinners.set(event.taskId, spinner);
        }

        if (spinner) {
            if (event.status === 'success') {
                spinner.succeed(this.formatText(event));
                this.spinners.delete(event.taskId);
            } else if (event.status === 'error') {
                spinner.fail(this.formatText(event));
                this.spinners.delete(event.taskId);
            } else {
                spinner.text = this.formatText(event);
            }
        }
    }

    private renderGlobalProgress() {
        const tasks = Array.from(this.taskStates.values());
        const completed = tasks.filter((t) => ['success', 'error'].includes(t.status)).length;

        const progress = (completed / tasks.length) * 100 || 0;
        const message = `Total progress: ${progress.toFixed(1)}%`;

        if (!this.showIndividual) {
            ora(message).info();
        }
    }

    private formatText(event: TaskEvent) {
        const parts = [
            `${event.name}:`,
            this.getStatusIcon(event.status),
            this.getProgressBar(event.progress),
            event.message,
        ]
            .filter(Boolean)
            .join(' ');

        return parts;
    }

    private getStatusIcon(status: TaskStatus) {
        return (
            {
                running: '🔄',
                success: '✅',
                error: '❌',
                timeout: '⏰',
                pending: '🕒',
            }[status] || '🔄'
        );
    }

    private getProgressBar(progress = 0) {
        const width = 20;
        const filled = Math.round(width * (progress / 100));
        return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${progress}%`;
    }
}
