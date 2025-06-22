import { ProgressManagerConfig, ScopedManager } from '@lania-cli/types';
import { TaskProgressManager } from '../utils';

// 全局 Map：配置字符串 -> TaskProgressManager 单例
const globalManagerMap = new Map<string, TaskProgressManager>();

const DEFAULT_CONFIG: ProgressManagerConfig = { type: 'spinner' };

function getGlobalManager(config: ProgressManagerConfig) {
    const key = JSON.stringify(config);
    if (!globalManagerMap.has(key)) {
        globalManagerMap.set(key, new TaskProgressManager(config.type));
    }
    return globalManagerMap.get(key)!;
}

export function ProgressGroup(groupName: string, config: ProgressManagerConfig = DEFAULT_CONFIG) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return function (constructor: Function) {
        constructor.prototype.__progressGroup = groupName;
        constructor.prototype.__progressManagerInstance = getGlobalManager(config);
    };
}

function createScopedManager(group: string, globalManager: TaskProgressManager): ScopedManager {
    return {
        increment: (amount = 1) => globalManager.increment(group, amount),
        set: (completed) => globalManager.set(group, completed),
        complete: () => globalManager.complete(group),
        fail: (msg) => globalManager.fail(group, msg),
        getProgress: () => globalManager.getProgress(group),
        updateTotal: (total = 1) => globalManager.updateTotal(group, total),
        init: (total = 1) => globalManager.init(group, total),
    };
}

export function ProgressStep(
    stepName: string,
    options: number | { total?: number; manual?: boolean; } = {},
) {
    const opts = typeof options === 'number' ? { total: options } : options;

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const original = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const group = this.__progressGroup || this.constructor.name || 'UnnamedGroup';
            const stepKey = `${group}:${stepName}`;

            const globalManager: TaskProgressManager = this.__progressManagerInstance;
            if (!globalManager) {
                throw new Error(
                    'ProgressManager instance not found. Did you forget @ProgressGroup?',
                );
            }

            if (!this.__progressScopedMap)
                this.__progressScopedMap = new Map<string, ScopedManager>();

            if (!this.__progressScopedMap.has(stepKey)) {
                this.__progressScopedMap.set(stepKey, createScopedManager(stepKey, globalManager));
            }

            this.__progressManager = this.__progressScopedMap.get(stepKey);

            // 自动 init，默认 total=1
            !opts?.manual && globalManager.init(stepKey, opts.total ?? 1);

            let alreadyCompleted = false;
            const originalComplete = this.__progressManager.complete.bind(this.__progressManager)
            this.__progressManager.complete = () => {
                alreadyCompleted = true;
                originalComplete();
            };

            try {
                const result = await original.apply(this, args);

                if (!alreadyCompleted && !opts.manual) {
                    this.__progressManager.complete();
                }

                return result;
            } catch (err) {
                if (!alreadyCompleted && !opts.manual) {
                    this.__progressManager.fail('Step failed');
                }
                throw err;
            }
        };
    };
}
