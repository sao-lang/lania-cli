// decorators/ProgressGroup.ts const PROGRESS_GROUP_KEY = '__progressGroup';

import { TaskProgressManager } from '../utils/task-progress-manager';

export function ProgressGroup(groupName: string) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return function (constructor: Function) {
        constructor.prototype[PROGRESS_GROUP_KEY] = groupName;
    };
}

// decorators/ProgressStep.ts import { TaskProgressManager } from '../core/TaskProgressManager';

const STEP_META_KEY = '__progressSteps';
const PROGRESS_GROUP_KEY = '__progressGroup';

type ProgressStepOptions = { total?: number; manual?: boolean };

export function ProgressStep(stepName: string, options: number | ProgressStepOptions = {}) {
    const opts = typeof options === 'number' ? { total: options } : options;

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const original = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const group = this[PROGRESS_GROUP_KEY] || 'UnnamedGroup';
            const key = `${group}:${stepName}`;
            const manager: TaskProgressManager =
                this.__progressManager ||
                (this.__progressManager = new TaskProgressManager(true, false));

            if (!opts.manual) {
                manager.init(key, opts.total ?? 1);
            }

            try {
                const result = await original.apply(this, args);
                if (!opts.manual) manager.complete(key);
                return result;
            } catch (err) {
                if (!opts.manual) manager.complete(key);
                throw err;
            }
        };

        // 可选：保留 step 元信息（供其他工具使用）
        if (!target[STEP_META_KEY]) {
            target[STEP_META_KEY] = [];
        }
        target[STEP_META_KEY].push({ name: stepName, method: propertyKey });
    };
}

